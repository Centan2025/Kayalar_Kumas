import { MarketplaceType } from './order.types';

export interface SyncCheckpoint {
  marketplace: MarketplaceType;
  lastSyncAt: string;
  cursor?: string;
  lastOrderId?: string;
  totalSynced: number;
}

export interface SyncResult {
  marketplace: MarketplaceType;
  synced: number;
  errors: number;
  skipped: number;
  duration: number;
  checkpoint: SyncCheckpoint;
}

export interface SyncBatchResult {
  results: SyncResult[];
  totalSynced: number;
  totalErrors: number;
  totalDuration: number;
  completedAt: string;
}

export interface SyncOptions {
  marketplaces?: MarketplaceType[];
  forceFullSync?: boolean;
  batchSize?: number;
}
