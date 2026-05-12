import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder, OrderStatus } from '../../core/types/order.types';

import { env } from '../../config/env';
import { Logger } from '../../services/logger/logger.service';

interface HBOrderItem {
  merchantSku: string;
  barcode: string;
  itemName: string;
  quantity: number;
  price: number;
}

interface HBRawOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: HBOrderItem[];
  totalPrice: number;
  status: string;
  orderDate: string;
  lastModifiedDate: string;
  cargoCompany?: string;
  trackingNumber?: string;
}

const HB_STATUS_MAP: Record<string, OrderStatus> = {
  Open: 'PENDING',
  Packed: 'READY_TO_SHIP',
  Unpacked: 'PENDING',
  InTransit: 'SHIPPED',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
  UnDeliverable: 'RETURNED',
};

export class HepsiburadaProvider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'HEPSIBURADA';

  async getOrders(): Promise<UnifiedOrder[]> {
    if (!env.HEPSIBURADA_MERCHANT_ID || !env.HEPSIBURADA_API_KEY) {
      Logger.warn('[Hepsiburada] Credentials missing — returning empty');
      return [];
    }

    const url = `https://mpop-sit.hepsiburada.com/orders/merchantid/${env.HEPSIBURADA_MERCHANT_ID}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.HEPSIBURADA_MERCHANT_ID}:${env.HEPSIBURADA_API_KEY}`).toString('base64')}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`Hepsiburada API ${response.status}: ${response.statusText}`));
    }

    const json = (await response.json()) as { orders: HBRawOrder[] };
    return (json.orders ?? []).map((raw) => this.normalizeOrder(raw));
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    if (!env.HEPSIBURADA_MERCHANT_ID || !env.HEPSIBURADA_API_KEY) {
      throw new Error('Hepsiburada credentials missing');
    }

    const url = `https://mpop-sit.hepsiburada.com/orders/merchantid/${env.HEPSIBURADA_MERCHANT_ID}?orderNumber=${orderId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.HEPSIBURADA_MERCHANT_ID}:${env.HEPSIBURADA_API_KEY}`).toString('base64')}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) this.handleError(new Error(`Hepsiburada API ${response.status}`));

    const json = (await response.json()) as { orders: HBRawOrder[] };
    const raw = json.orders?.[0];
    if (!raw) throw new Error(`Order ${orderId} not found on Hepsiburada`);

    return this.normalizeOrder(raw);
  }

  async validateCredentials(): Promise<boolean> {
    return !!(env.HEPSIBURADA_MERCHANT_ID && env.HEPSIBURADA_API_KEY);
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as HBRawOrder;
    return {
      marketplace: 'HEPSIBURADA',
      marketplaceOrderId: data.orderNumber,
      packageId: data.id,
      customerName: data.customerName || 'Unknown',
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      items: (data.items ?? []).map((item) => ({
        sku: item.merchantSku,
        barcode: item.barcode,
        title: item.itemName,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      totalPrice: data.totalPrice,
      currency: 'TRY',
      status: HB_STATUS_MAP[data.status] ?? 'UNKNOWN',
      rawStatus: data.status,
      shipmentTrackingNumber: data.trackingNumber,
      cargoCompany: data.cargoCompany,
      createdAt: data.orderDate,
      updatedAt: data.lastModifiedDate,
      rawPayload: raw,
    };
  }
}
