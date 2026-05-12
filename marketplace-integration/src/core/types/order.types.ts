export type MarketplaceType = 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'CICEKSEPETI' | 'MOCK';

export type OrderStatus = 'PENDING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'UNKNOWN';

export interface OrderItem {
  sku: string;
  barcode: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface UnifiedOrder {
  marketplace: MarketplaceType;
  marketplaceOrderId: string;
  packageId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalPrice: number;
  currency: string;
  status: OrderStatus;
  rawStatus: string;
  shipmentTrackingNumber?: string;
  cargoCompany?: string;
  createdAt: string;
  updatedAt: string;
  rawPayload: unknown;
}
