import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder, OrderStatus } from '../../core/types/order.types';

import { env } from '../../config/env';
import { Logger } from '../../services/logger/logger.service';

interface N11OrderItem {
  sellerStockCode: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
}

interface N11Buyer {
  fullName: string;
  email?: string;
  phone?: string;
}

interface N11RawOrder {
  id: string;
  orderNumber: string;
  buyer: N11Buyer;
  orderItemList: { orderItem: N11OrderItem[] };
  totalAmount: number;
  status: string;
  createDate: string;
  updateDate: string;
  cargoCompany?: string;
  cargoKey?: string;
}

const N11_STATUS_MAP: Record<string, OrderStatus> = {
  New: 'PENDING',
  Approved: 'READY_TO_SHIP',
  Rejected: 'CANCELLED',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  Completed: 'DELIVERED',
  CLAIM_MADE: 'RETURNED',
};

export class N11Provider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'N11';

  async getOrders(): Promise<UnifiedOrder[]> {
    if (!env.N11_APP_KEY || !env.N11_APP_SECRET) {
      Logger.warn('[N11] Credentials missing — returning empty');
      return [];
    }

    // N11 uses SOAP API — in production this would use an XML SOAP client
    // For now, structured as REST-compatible skeleton
    const url = 'https://api.n11.com/ws/orderService/';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: this.buildSoapEnvelope('DetailedOrderList'),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`N11 API ${response.status}: ${response.statusText}`));
    }

    // In production: parse XML response to N11RawOrder[]
    // Returning empty for now since SOAP parsing requires xml2js or similar
    return [];
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    if (!env.N11_APP_KEY || !env.N11_APP_SECRET) {
      throw new Error('N11 credentials missing');
    }
    throw new Error(`N11 getOrderById not implemented for ${orderId}`);
  }

  async validateCredentials(): Promise<boolean> {
    return !!(env.N11_APP_KEY && env.N11_APP_SECRET);
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as N11RawOrder;
    return {
      marketplace: 'N11',
      marketplaceOrderId: data.orderNumber,
      packageId: data.id,
      customerName: data.buyer?.fullName || 'Unknown',
      customerEmail: data.buyer?.email,
      customerPhone: data.buyer?.phone,
      items: (data.orderItemList?.orderItem ?? []).map((item) => ({
        sku: item.sellerStockCode,
        barcode: item.barcode,
        title: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      totalPrice: data.totalAmount,
      currency: 'TRY',
      status: N11_STATUS_MAP[data.status] ?? 'UNKNOWN',
      rawStatus: data.status,
      cargoCompany: data.cargoCompany,
      shipmentTrackingNumber: data.cargoKey,
      createdAt: data.createDate,
      updatedAt: data.updateDate,
      rawPayload: raw,
    };
  }

  private buildSoapEnvelope(method: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:${method}Request>
      <auth>
        <appKey>${env.N11_APP_KEY}</appKey>
        <appSecret>${env.N11_APP_SECRET}</appSecret>
      </auth>
    </sch:${method}Request>
  </soapenv:Body>
</soapenv:Envelope>`;
  }
}
