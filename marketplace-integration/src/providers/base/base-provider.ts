import { MarketplaceProvider, GetOrdersFilters } from '../../core/interfaces/marketplace-provider.interface';
import { MarketplaceType, UnifiedOrder } from '../../core/types/order.types';
import { ProviderError } from '../../core/errors/base-error';
import { Logger } from '../../services/logger/logger.service';

export abstract class BaseMarketplaceProvider implements MarketplaceProvider {
  abstract readonly name: MarketplaceType;

  abstract getOrders(filters?: GetOrdersFilters): Promise<UnifiedOrder[]>;
  abstract getOrderById(orderId: string): Promise<UnifiedOrder>;
  abstract validateCredentials(): Promise<boolean>;
  abstract normalizeOrder(raw: unknown): UnifiedOrder;

  async syncOrders(): Promise<{ synced: number; errors: number }> {
    try {
      const orders = await this.getOrders();
      return { synced: orders.length, errors: 0 };
    } catch (error) {
      Logger.error(`[${this.name}] Sync failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { synced: 0, errors: 1 };
    }
  }

  async healthCheck(): Promise<{ status: 'OK' | 'ERROR'; message?: string }> {
    try {
      const isValid = await this.validateCredentials();
      return isValid
        ? { status: 'OK' }
        : { status: 'ERROR', message: 'Invalid credentials' };
    } catch (error) {
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  protected handleError(error: unknown, context?: Record<string, unknown>): never {
    if (error instanceof ProviderError) throw error;

    throw new ProviderError(
      error instanceof Error ? error.message : 'Unknown provider error',
      this.name,
      'UNKNOWN_PROVIDER_ERROR',
      500,
      context
    );
  }
}
