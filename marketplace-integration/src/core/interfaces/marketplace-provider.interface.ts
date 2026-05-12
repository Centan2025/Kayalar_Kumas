import { MarketplaceType, UnifiedOrder, OrderStatus } from '../types/order.types';

export interface GetOrdersFilters {
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceProvider {
  readonly name: MarketplaceType;

  getOrders(filters?: GetOrdersFilters): Promise<UnifiedOrder[]>;
  getOrderById(orderId: string): Promise<UnifiedOrder>;
  syncOrders(): Promise<{ synced: number; errors: number }>;
  normalizeOrder(raw: unknown): UnifiedOrder;
  validateCredentials(): Promise<boolean>;
  healthCheck(): Promise<{ status: 'OK' | 'ERROR'; message?: string }>;
}
