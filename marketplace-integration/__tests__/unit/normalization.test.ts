import { describe, it, expect } from 'vitest';
import { NormalizationService } from '../../src/services/normalization/normalization.service';
import { UnifiedOrder } from '../../src/core/types/order.types';

const makeOrder = (overrides: Partial<UnifiedOrder> = {}): UnifiedOrder => ({
  marketplace: 'MOCK',
  marketplaceOrderId: 'ORD-001',
  packageId: 'PKG-001',
  customerName: 'Test User',
  items: [{ sku: 'S1', barcode: 'B1', title: 'Item', quantity: 2, unitPrice: 100 }],
  totalPrice: 200,
  currency: 'TRY',
  status: 'PENDING',
  rawStatus: 'pending',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  rawPayload: {},
  ...overrides,
});

describe('NormalizationService', () => {
  describe('sanitize', () => {
    it('should trim customer name', () => {
      const order = makeOrder({ customerName: '  Ahmet  ' });
      const result = NormalizationService.sanitize(order);
      expect(result.customerName).toBe('Ahmet');
    });

    it('should default missing customerName to Unknown', () => {
      const order = makeOrder({ customerName: '' });
      const result = NormalizationService.sanitize(order);
      expect(result.customerName).toBe('Unknown');
    });

    it('should clamp negative totalPrice to 0', () => {
      const order = makeOrder({ totalPrice: -50 });
      const result = NormalizationService.sanitize(order);
      expect(result.totalPrice).toBe(0);
    });

    it('should floor item quantities', () => {
      const order = makeOrder({
        items: [{ sku: 'S1', barcode: 'B1', title: 'X', quantity: 2.7, unitPrice: 10 }],
      });
      const result = NormalizationService.sanitize(order);
      expect(result.items[0].quantity).toBe(2);
    });

    it('should default invalid status to UNKNOWN', () => {
      const order = makeOrder({ status: 'INVALID' as UnifiedOrder['status'] });
      const result = NormalizationService.sanitize(order);
      expect(result.status).toBe('UNKNOWN');
    });
  });

  describe('deduplicate', () => {
    it('should keep most recently updated order when duplicates exist', () => {
      const old = makeOrder({ updatedAt: '2025-01-01T00:00:00Z' });
      const newer = makeOrder({ updatedAt: '2025-06-01T00:00:00Z', totalPrice: 999 });
      const result = NormalizationService.deduplicate([old, newer]);
      expect(result).toHaveLength(1);
      expect(result[0].totalPrice).toBe(999);
    });

    it('should keep distinct orders', () => {
      const a = makeOrder({ marketplaceOrderId: 'A' });
      const b = makeOrder({ marketplaceOrderId: 'B' });
      const result = NormalizationService.deduplicate([a, b]);
      expect(result).toHaveLength(2);
    });
  });

  describe('resolveConflict', () => {
    it('should prefer remote when status is further along', () => {
      const local = makeOrder({ status: 'PENDING' });
      const remote = makeOrder({ status: 'SHIPPED' });
      const winner = NormalizationService.resolveConflict(local, remote);
      expect(winner.status).toBe('SHIPPED');
    });

    it('should prefer local when local status is further along', () => {
      const local = makeOrder({ status: 'DELIVERED' });
      const remote = makeOrder({ status: 'PENDING' });
      const winner = NormalizationService.resolveConflict(local, remote);
      expect(winner.status).toBe('DELIVERED');
    });

    it('should prefer more recently updated when same status', () => {
      const local = makeOrder({ status: 'SHIPPED', updatedAt: '2025-01-01T00:00:00Z' });
      const remote = makeOrder({ status: 'SHIPPED', updatedAt: '2025-06-01T00:00:00Z' });
      const winner = NormalizationService.resolveConflict(local, remote);
      expect(winner.updatedAt).toBe('2025-06-01T00:00:00Z');
    });
  });

  describe('mapStatusGeneric', () => {
    it.each([
      ['Pending', 'PENDING'],
      ['New', 'PENDING'],
      ['Shipped', 'SHIPPED'],
      ['Delivered', 'DELIVERED'],
      ['Cancelled', 'CANCELLED'],
      ['Canceled', 'CANCELLED'],
      ['RANDOM', 'UNKNOWN'],
    ])('should map "%s" → %s', (input, expected) => {
      expect(NormalizationService.mapStatusGeneric(input)).toBe(expected);
    });
  });
});
