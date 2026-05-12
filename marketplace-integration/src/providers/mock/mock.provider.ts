import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder } from '../../core/types/order.types';

import { MOCK_ORDERS } from './mock.fixtures';

export class MockProvider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'MOCK';

  async getOrders(): Promise<UnifiedOrder[]> {
    return MOCK_ORDERS.map((raw) => this.normalizeOrder(raw));
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    const found = MOCK_ORDERS.find((o) => o.id === orderId);
    return this.normalizeOrder(found ?? { id: orderId, amount: 0, customer: 'Unknown', items: [] });
  }

  async validateCredentials(): Promise<boolean> {
    return true;
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as MockRawOrder;
    return {
      marketplace: 'MOCK',
      marketplaceOrderId: data.id,
      packageId: `PKG-${data.id}`,
      customerName: data.customer,
      items: (data.items ?? []).map((item) => ({
        sku: item.sku,
        barcode: item.barcode,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totalPrice: data.amount,
      currency: 'TRY',
      status: 'DELIVERED',
      rawStatus: 'delivered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rawPayload: raw,
    };
  }
}

interface MockRawOrder {
  id: string;
  amount: number;
  customer: string;
  items?: Array<{
    sku: string;
    barcode: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}
