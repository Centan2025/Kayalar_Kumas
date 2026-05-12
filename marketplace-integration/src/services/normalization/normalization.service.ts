import { OrderStatus, UnifiedOrder } from '../../core/types/order.types';

const STATUS_PRIORITY: Record<OrderStatus, number> = {
  PENDING: 1,
  READY_TO_SHIP: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
  RETURNED: 6,
  UNKNOWN: 0,
};

export class NormalizationService {
  /**
   * Validates and sanitizes a UnifiedOrder after normalization.
   * Fills missing fields with defaults, trims strings, validates price.
   */
  static sanitize(order: UnifiedOrder): UnifiedOrder {
    return {
      ...order,
      customerName: (order.customerName || 'Unknown').trim(),
      customerEmail: order.customerEmail?.trim(),
      customerPhone: order.customerPhone?.trim(),
      totalPrice: Math.max(0, Number(order.totalPrice) || 0),
      currency: order.currency || 'TRY',
      status: NormalizationService.isValidStatus(order.status) ? order.status : 'UNKNOWN',
      items: order.items.map((item) => ({
        ...item,
        sku: (item.sku || '').trim(),
        barcode: (item.barcode || '').trim(),
        title: (item.title || '').trim(),
        quantity: Math.max(0, Math.floor(item.quantity)),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      })),
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * De-duplicate orders by marketplace + marketplaceOrderId.
   * If conflict: keeps the most recently updated version.
   */
  static deduplicate(orders: UnifiedOrder[]): UnifiedOrder[] {
    const map = new Map<string, UnifiedOrder>();

    for (const order of orders) {
      const key = `${order.marketplace}_${order.marketplaceOrderId}`;
      const existing = map.get(key);

      if (!existing || new Date(order.updatedAt) > new Date(existing.updatedAt)) {
        map.set(key, order);
      }
    }

    return Array.from(map.values());
  }

  /**
   * Resolve conflicts between local and remote versions.
   * Remote wins if its status is further along the pipeline, or if updated more recently.
   */
  static resolveConflict(local: UnifiedOrder, remote: UnifiedOrder): UnifiedOrder {
    const localPriority = STATUS_PRIORITY[local.status] ?? 0;
    const remotePriority = STATUS_PRIORITY[remote.status] ?? 0;

    if (remotePriority > localPriority) return remote;
    if (remotePriority < localPriority) return local;

    // Same status — take the latest updated
    return new Date(remote.updatedAt) >= new Date(local.updatedAt) ? remote : local;
  }

  /**
   * Map arbitrary raw status strings to standard OrderStatus.
   * Falls back to UNKNOWN.
   */
  static mapStatusGeneric(rawStatus: string): OrderStatus {
    const normalized = rawStatus.toUpperCase().replace(/[\s_-]/g, '');
    const map: Record<string, OrderStatus> = {
      PENDING: 'PENDING',
      NEW: 'PENDING',
      CREATED: 'PENDING',
      OPEN: 'PENDING',
      APPROVED: 'READY_TO_SHIP',
      PACKED: 'READY_TO_SHIP',
      READYTOSHIP: 'READY_TO_SHIP',
      PICKING: 'READY_TO_SHIP',
      SHIPPED: 'SHIPPED',
      INTRANSIT: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      COMPLETED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      CANCELED: 'CANCELLED',
      RETURNED: 'RETURNED',
      REFUNDED: 'RETURNED',
    };
    return map[normalized] ?? 'UNKNOWN';
  }

  private static isValidStatus(status: string): status is OrderStatus {
    return ['PENDING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'UNKNOWN'].includes(status);
  }
}
