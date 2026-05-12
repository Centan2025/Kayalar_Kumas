import { BaseMarketplaceProvider } from '../base/base-provider';
import { MarketplaceType, UnifiedOrder, OrderStatus } from '../../core/types/order.types';
import { GetOrdersFilters } from '../../core/interfaces/marketplace-provider.interface';
import { env } from '../../config/env';
import { Logger } from '../../services/logger/logger.service';

interface CSOrderItem {
  stockCode: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
}

interface CSRawOrder {
  orderId: number;
  orderNo: string;
  receiverName: string;
  receiverEmail?: string;
  receiverPhone?: string;
  orderItems: CSOrderItem[];
  totalPrice: number;
  orderStatus: number;
  orderDate: string;
  modifyDate: string;
  cargoCompany?: string;
  cargoTrackingNumber?: string;
}

const CS_STATUS_MAP: Record<number, OrderStatus> = {
  1: 'PENDING',
  2: 'READY_TO_SHIP',
  3: 'SHIPPED',
  4: 'DELIVERED',
  5: 'CANCELLED',
  6: 'RETURNED',
};

export class CicekSepetiProvider extends BaseMarketplaceProvider {
  readonly name: MarketplaceType = 'CICEKSEPETI';

  async getOrders(filters?: GetOrdersFilters): Promise<UnifiedOrder[]> {
    if (!env.CICEKSEPETI_API_KEY) {
      Logger.warn('[CicekSepeti] Credentials missing — returning empty');
      return [];
    }

    const url = 'https://apis.ciceksepeti.com/api/v1/Order/GetOrders';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': env.CICEKSEPETI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: filters?.dateFrom ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: filters?.dateTo ?? new Date().toISOString(),
        pageSize: 50,
        page: filters?.page ?? 1,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      this.handleError(new Error(`CicekSepeti API ${response.status}: ${response.statusText}`));
    }

    const json = (await response.json()) as { supplierOrderListWithBranch: CSRawOrder[] };
    return (json.supplierOrderListWithBranch ?? []).map((raw) => this.normalizeOrder(raw));
  }

  async getOrderById(orderId: string): Promise<UnifiedOrder> {
    if (!env.CICEKSEPETI_API_KEY) {
      throw new Error('CicekSepeti credentials missing');
    }

    const url = `https://apis.ciceksepeti.com/api/v1/Order/GetOrderDetail?orderNo=${orderId}`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': env.CICEKSEPETI_API_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) this.handleError(new Error(`CicekSepeti API ${response.status}`));

    const raw = (await response.json()) as CSRawOrder;
    return this.normalizeOrder(raw);
  }

  async validateCredentials(): Promise<boolean> {
    return !!env.CICEKSEPETI_API_KEY;
  }

  normalizeOrder(raw: unknown): UnifiedOrder {
    const data = raw as CSRawOrder;
    return {
      marketplace: 'CICEKSEPETI',
      marketplaceOrderId: data.orderNo,
      packageId: data.orderId.toString(),
      customerName: data.receiverName || 'Unknown',
      customerEmail: data.receiverEmail,
      customerPhone: data.receiverPhone,
      items: (data.orderItems ?? []).map((item) => ({
        sku: item.stockCode,
        barcode: item.barcode,
        title: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      totalPrice: data.totalPrice,
      currency: 'TRY',
      status: CS_STATUS_MAP[data.orderStatus] ?? 'UNKNOWN',
      rawStatus: data.orderStatus.toString(),
      shipmentTrackingNumber: data.cargoTrackingNumber,
      cargoCompany: data.cargoCompany,
      createdAt: data.orderDate,
      updatedAt: data.modifyDate,
      rawPayload: raw,
    };
  }
}
