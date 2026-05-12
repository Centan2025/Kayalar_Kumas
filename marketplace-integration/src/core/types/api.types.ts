import { MarketplaceType, OrderStatus, UnifiedOrder } from './order.types';
import { ProviderHealthStatus } from './provider.types';
import { SyncBatchResult } from './sync.types';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface OrdersQueryParams {
  marketplace?: MarketplaceType;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export type OrdersResponse = ApiResponse<UnifiedOrder[]>;
export type OrderResponse = ApiResponse<UnifiedOrder>;
export type SyncResponse = ApiResponse<SyncBatchResult>;
export type HealthResponse = ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: ProviderHealthStatus[];
  uptime: number;
}>;
