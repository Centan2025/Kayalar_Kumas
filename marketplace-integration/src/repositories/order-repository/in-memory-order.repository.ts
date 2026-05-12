import { UnifiedOrder, MarketplaceType, OrderStatus } from '../../core/types/order.types';

export interface OrderFilters {
  marketplace?: MarketplaceType;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderRepository {
  save(order: UnifiedOrder): Promise<void>;
  saveBatch(orders: UnifiedOrder[]): Promise<void>;
  findById(id: string): Promise<UnifiedOrder | null>;
  findAll(filters?: OrderFilters): Promise<UnifiedOrder[]>;
  delete(id: string): Promise<void>;
  count(filters?: OrderFilters): Promise<number>;
}

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, UnifiedOrder>();

  async save(order: UnifiedOrder): Promise<void> {
    const key = `${order.marketplace}_${order.marketplaceOrderId}`;
    this.orders.set(key, order);
  }

  async saveBatch(orders: UnifiedOrder[]): Promise<void> {
    for (const order of orders) {
      await this.save(order);
    }
  }

  async findById(id: string): Promise<UnifiedOrder | null> {
    return this.orders.get(id) ?? null;
  }

  async findAll(filters?: OrderFilters): Promise<UnifiedOrder[]> {
    let result = Array.from(this.orders.values());

    if (filters?.marketplace) {
      result = result.filter((o) => o.marketplace === filters.marketplace);
    }

    if (filters?.status) {
      result = result.filter((o) => o.status === filters.status);
    }

    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((o) => new Date(o.createdAt) >= from);
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      result = result.filter((o) => new Date(o.createdAt) <= to);
    }

    // Sort by createdAt descending
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id);
  }

  async count(filters?: OrderFilters): Promise<number> {
    const all = await this.findAll(filters);
    return all.length;
  }
}
