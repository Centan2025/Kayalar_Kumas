import { MarketplaceType, UnifiedOrder } from '../../core/types/order.types';
import { SyncCheckpoint, SyncResult, SyncBatchResult, SyncOptions } from '../../core/types/sync.types';
import { MarketplaceProvider } from '../../core/interfaces/marketplace-provider.interface';
import { MarketplaceProviderFactory } from '../../providers/factory';
import { InMemoryOrderRepository } from '../../repositories/order-repository/in-memory-order.repository';
import { NormalizationService } from '../normalization/normalization.service';
import { RetryService } from '../retry/retry.service';
import { CircuitBreaker } from '../retry/circuit-breaker';
import { CacheService } from '../cache/cache.service';
import { Logger } from '../logger/logger.service';

const ALL_MARKETPLACES: MarketplaceType[] = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'AMAZON', 'CICEKSEPETI'];

export class OrderSyncService {
  private readonly repository: InMemoryOrderRepository;
  private readonly cache: CacheService;
  private readonly circuitBreakers: Map<MarketplaceType, CircuitBreaker>;
  private readonly checkpoints: Map<MarketplaceType, SyncCheckpoint>;

  constructor() {
    this.repository = new InMemoryOrderRepository();
    this.cache = new CacheService(120_000); // 2 min cache
    this.circuitBreakers = new Map();
    this.checkpoints = new Map();

    for (const mp of ALL_MARKETPLACES) {
      this.circuitBreakers.set(mp, new CircuitBreaker(mp, { failureThreshold: 3, resetTimeoutMs: 120_000 }));
    }
  }

  async syncAll(options?: SyncOptions): Promise<SyncBatchResult> {
    const correlationId = crypto.randomUUID();
    Logger.setCorrelationId(correlationId);

    const marketplaces = options?.marketplaces ?? ALL_MARKETPLACES;
    const startTime = Date.now();
    const results: SyncResult[] = [];

    Logger.info('[OrderSync] Starting batch sync', {
      marketplaces,
      forceFullSync: options?.forceFullSync ?? false,
    });

    const settled = await Promise.allSettled(
      marketplaces.map((mp) => this.syncMarketplace(mp, options))
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      }
      // rejected outcomes were already logged inside syncMarketplace
    }

    const totalDuration = Date.now() - startTime;
    const batchResult: SyncBatchResult = {
      results,
      totalSynced: results.reduce((sum, r) => sum + r.synced, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      totalDuration,
      completedAt: new Date().toISOString(),
    };

    Logger.info('[OrderSync] Batch sync complete', {
      totalSynced: batchResult.totalSynced,
      totalErrors: batchResult.totalErrors,
      durationMs: totalDuration,
    });

    // Invalidate order cache after sync
    this.cache.invalidateByPrefix('orders_');

    Logger.clearCorrelationId();
    return batchResult;
  }

  private async syncMarketplace(marketplace: MarketplaceType, options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const cb = this.circuitBreakers.get(marketplace);

    if (!cb) {
      return this.emptySyncResult(marketplace, startTime);
    }

    try {
      const result = await cb.execute(async () => {
        return await RetryService.execute(
          () => this.fetchAndStore(marketplace, options),
          { maxAttempts: 3 },
          `sync_${marketplace}`
        );
      });
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      Logger.error(`[OrderSync] Sync failed for ${marketplace}`, { error: errMsg });

      return {
        marketplace,
        synced: 0,
        errors: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        checkpoint: this.getCheckpoint(marketplace),
      };
    }
  }

  private async fetchAndStore(marketplace: MarketplaceType, options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const provider: MarketplaceProvider = MarketplaceProviderFactory.getProvider(marketplace);

    const checkpoint = options?.forceFullSync ? undefined : this.checkpoints.get(marketplace);

    const rawOrders = await provider.getOrders(
      checkpoint ? { dateFrom: checkpoint.lastSyncAt } : undefined
    );

    // Sanitize
    const sanitized = rawOrders.map((o) => NormalizationService.sanitize(o));

    // Dedup
    const deduped = NormalizationService.deduplicate(sanitized);

    // Conflict resolution against existing
    const toSave: UnifiedOrder[] = [];
    let skipped = 0;

    for (const order of deduped) {
      const existing = await this.repository.findById(`${order.marketplace}_${order.marketplaceOrderId}`);
      if (existing) {
        const winner = NormalizationService.resolveConflict(existing, order);
        if (winner === existing) {
          skipped++;
          continue;
        }
      }
      toSave.push(order);
    }

    // Batch save
    await this.repository.saveBatch(toSave);

    // Update checkpoint
    const now = new Date().toISOString();
    const newCheckpoint: SyncCheckpoint = {
      marketplace,
      lastSyncAt: now,
      lastOrderId: toSave[toSave.length - 1]?.marketplaceOrderId,
      totalSynced: (checkpoint?.totalSynced ?? 0) + toSave.length,
    };
    this.checkpoints.set(marketplace, newCheckpoint);

    Logger.info(`[OrderSync] ${marketplace} synced`, {
      fetched: rawOrders.length,
      saved: toSave.length,
      skipped,
    });

    return {
      marketplace,
      synced: toSave.length,
      errors: 0,
      skipped,
      duration: Date.now() - startTime,
      checkpoint: newCheckpoint,
    };
  }

  async getOrders(filters?: Record<string, unknown>): Promise<UnifiedOrder[]> {
    const cacheKey = `orders_${JSON.stringify(filters ?? {})}`;
    const cached = this.cache.get<UnifiedOrder[]>(cacheKey);
    if (cached) return cached;

    const orders = await this.repository.findAll(filters);
    this.cache.set(cacheKey, orders);
    return orders;
  }

  async getOrderById(id: string): Promise<UnifiedOrder | null> {
    return this.repository.findById(id);
  }

  getCheckpoint(marketplace: MarketplaceType): SyncCheckpoint {
    return this.checkpoints.get(marketplace) ?? {
      marketplace,
      lastSyncAt: new Date(0).toISOString(),
      totalSynced: 0,
    };
  }

  private emptySyncResult(marketplace: MarketplaceType, startTime: number): SyncResult {
    return {
      marketplace,
      synced: 0,
      errors: 0,
      skipped: 0,
      duration: Date.now() - startTime,
      checkpoint: this.getCheckpoint(marketplace),
    };
  }
}

// Singleton export
export const orderSyncService = new OrderSyncService();
