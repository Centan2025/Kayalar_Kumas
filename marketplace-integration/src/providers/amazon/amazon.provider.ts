import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder, OrderStatus } from '../../core/types/order.types';

import { env } from '../../config/env';
import { Logger } from '../../services/logger/logger.service';

interface AmazonBuyerInfo {
  BuyerName?: string;
  BuyerEmail?: string;
}

interface AmazonOrderTotal {
  Amount: string;
  CurrencyCode: string;
}

interface AmazonRawOrder {
  AmazonOrderId: string;
  BuyerInfo?: AmazonBuyerInfo;
  OrderTotal?: AmazonOrderTotal;
  OrderStatus: string;
  PurchaseDate: string;
  LastUpdateDate: string;
}

const AMAZON_STATUS_MAP: Record<string, OrderStatus> = {
  Pending: 'PENDING',
  Unshipped: 'READY_TO_SHIP',
  PartiallyShipped: 'SHIPPED',
  Shipped: 'SHIPPED',
  InvoiceUnconfirmed: 'READY_TO_SHIP',
  Canceled: 'CANCELLED',
  Unfulfillable: 'CANCELLED',
};

export class AmazonProvider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'AMAZON';

  async getOrders(): Promise<UnifiedOrder[]> {
    if (!env.AMAZON_SELLER_ID || !env.AMAZON_MWS_AUTH_TOKEN) {
      Logger.warn('[Amazon] Credentials missing — returning empty');
      return [];
    }

    // Amazon SP-API requires OAuth2 flow + signing
    // In production: use @aws-sdk or sp-api library
    const url = `https://sellingpartnerapi-eu.amazon.com/orders/v0/orders?MarketplaceIds=A33AVAJ2PDY3EV`;
    const response = await fetch(url, {
      headers: {
        'x-amz-access-token': env.AMAZON_MWS_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`Amazon API ${response.status}: ${response.statusText}`));
    }

    const json = (await response.json()) as { payload: { Orders: AmazonRawOrder[] } };
    return (json.payload?.Orders ?? []).map((raw) => this.normalizeOrder(raw));
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    if (!env.AMAZON_SELLER_ID || !env.AMAZON_MWS_AUTH_TOKEN) {
      throw new Error('Amazon credentials missing');
    }

    const url = `https://sellingpartnerapi-eu.amazon.com/orders/v0/orders/${orderId}`;
    const response = await fetch(url, {
      headers: {
        'x-amz-access-token': env.AMAZON_MWS_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) this.handleError(new Error(`Amazon API ${response.status}`));

    const json = (await response.json()) as { payload: AmazonRawOrder };
    return this.normalizeOrder(json.payload);
  }

  async validateCredentials(): Promise<boolean> {
    return !!(env.AMAZON_SELLER_ID && env.AMAZON_MWS_AUTH_TOKEN);
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as AmazonRawOrder;
    return {
      marketplace: 'AMAZON',
      marketplaceOrderId: data.AmazonOrderId,
      packageId: data.AmazonOrderId,
      customerName: data.BuyerInfo?.BuyerName || 'Unknown',
      customerEmail: data.BuyerInfo?.BuyerEmail,
      items: [], // Amazon requires separate GetOrderItems API call
      totalPrice: parseFloat(data.OrderTotal?.Amount || '0'),
      currency: data.OrderTotal?.CurrencyCode || 'TRY',
      status: AMAZON_STATUS_MAP[data.OrderStatus] ?? 'UNKNOWN',
      rawStatus: data.OrderStatus,
      createdAt: data.PurchaseDate,
      updatedAt: data.LastUpdateDate,
      rawPayload: raw,
    };
  }
}
