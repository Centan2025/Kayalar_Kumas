import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder, OrderStatus } from '../../core/types/order.types';

import { env } from '../../config/env';
import { Logger } from '../../services/logger/logger.service';

interface TrendyolOrderLine {
  merchantSku: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
}

interface TrendyolRawOrder {
  id: number;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail?: string;
  lines: TrendyolOrderLine[];
  totalPrice: number;
  status: string;
  orderDate: number;
  lastModifiedDate: number;
  cargoProviderName?: string;
  cargoTrackingNumber?: string;
}

const TRENDYOL_STATUS_MAP: Record<string, OrderStatus> = {
  Created: 'PENDING',
  Picking: 'READY_TO_SHIP',
  Invoiced: 'READY_TO_SHIP',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
  UnDelivered: 'RETURNED',
};

export class TrendyolProvider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'TRENDYOL';
  private readonly baseUrl = 'https://api.trendyol.com/sapigw';

  async getOrders(): Promise<UnifiedOrder[]> {
    if (!env.TRENDYOL_SELLER_ID || !env.TRENDYOL_API_KEY || !env.TRENDYOL_API_SECRET) {
      Logger.warn('[Trendyol] Credentials missing — returning empty');
      return [];
    }

    const url = `${this.baseUrl}/suppliers/${env.TRENDYOL_SELLER_ID}/orders`;
    const authHeader = Buffer.from(`${env.TRENDYOL_API_KEY}:${env.TRENDYOL_API_SECRET}`).toString('base64');

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'User-Agent': `${env.TRENDYOL_SELLER_ID} - SelfIntegration`,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`Trendyol API ${response.status}: ${response.statusText}`));
    }

    const json = (await response.json()) as { content: TrendyolRawOrder[] };
    return (json.content ?? []).map((raw) => this.normalizeOrder(raw));
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    if (!env.TRENDYOL_SELLER_ID || !env.TRENDYOL_API_KEY || !env.TRENDYOL_API_SECRET) {
      throw new Error('Trendyol credentials missing');
    }

    const url = `${this.baseUrl}/suppliers/${env.TRENDYOL_SELLER_ID}/orders?orderNumber=${orderId}`;
    const authHeader = Buffer.from(`${env.TRENDYOL_API_KEY}:${env.TRENDYOL_API_SECRET}`).toString('base64');

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`Trendyol API ${response.status}`));
    }

    const json = (await response.json()) as { content: TrendyolRawOrder[] };
    const raw = json.content?.[0];
    if (!raw) throw new Error(`Order ${orderId} not found on Trendyol`);

    return this.normalizeOrder(raw);
  }

  async validateCredentials(): Promise<boolean> {
    return !!(env.TRENDYOL_SELLER_ID && env.TRENDYOL_API_KEY && env.TRENDYOL_API_SECRET);
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as TrendyolRawOrder;
    return {
      marketplace: 'TRENDYOL',
      marketplaceOrderId: data.orderNumber,
      packageId: data.id.toString(),
      customerName: `${data.customerFirstName} ${data.customerLastName}`.trim(),
      customerEmail: data.customerEmail,
      items: data.lines.map((line) => ({
        sku: line.merchantSku,
        barcode: line.barcode,
        title: line.productName,
        quantity: line.quantity,
        unitPrice: line.price,
      })),
      totalPrice: data.totalPrice,
      currency: 'TRY',
      status: TRENDYOL_STATUS_MAP[data.status] ?? 'UNKNOWN',
      rawStatus: data.status,
      shipmentTrackingNumber: data.cargoTrackingNumber,
      cargoCompany: data.cargoProviderName,
      createdAt: new Date(data.orderDate).toISOString(),
      updatedAt: new Date(data.lastModifiedDate).toISOString(),
      rawPayload: raw,
    };
  }
}
