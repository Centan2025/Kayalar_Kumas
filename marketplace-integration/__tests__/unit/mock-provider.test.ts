import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock/mock.provider';

describe('MockProvider', () => {
  const provider = new MockProvider();

  it('should return MOCK as name', () => {
    expect(provider.name).toBe('MOCK');
  });

  it('should validate credentials successfully', async () => {
    const result = await provider.validateCredentials();
    expect(result).toBe(true);
  });

  it('should return health OK', async () => {
    const health = await provider.healthCheck();
    expect(health.status).toBe('OK');
  });

  it('should return mock orders from getOrders', async () => {
    const orders = await provider.getOrders();
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].marketplace).toBe('MOCK');
    expect(orders[0].marketplaceOrderId).toBeDefined();
    expect(orders[0].items.length).toBeGreaterThan(0);
  });

  it('should return a single order by ID', async () => {
    const order = await provider.getOrderById('MOCK-001');
    expect(order.marketplace).toBe('MOCK');
    expect(order.marketplaceOrderId).toBe('MOCK-001');
  });

  it('should normalize raw payload correctly', () => {
    const raw = {
      id: 'TEST-99',
      amount: 500,
      customer: 'Test User',
      items: [
        { sku: 'S1', barcode: 'B1', title: 'Item 1', quantity: 2, unitPrice: 250 },
      ],
    };

    const normalized = provider.normalizeOrder(raw);
    expect(normalized.marketplace).toBe('MOCK');
    expect(normalized.marketplaceOrderId).toBe('TEST-99');
    expect(normalized.totalPrice).toBe(500);
    expect(normalized.customerName).toBe('Test User');
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].sku).toBe('S1');
    expect(normalized.currency).toBe('TRY');
    expect(normalized.status).toBe('DELIVERED');
    expect(normalized.rawPayload).toBe(raw);
  });

  it('should handle missing items gracefully', () => {
    const raw = { id: 'NO-ITEMS', amount: 0, customer: 'Empty' };
    const normalized = provider.normalizeOrder(raw);
    expect(normalized.items).toEqual([]);
  });
});
