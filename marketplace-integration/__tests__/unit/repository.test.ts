import { describe, it, expect } from 'vitest';
import { InMemoryOrderRepository } from '../../src/repositories/order-repository/in-memory-order.repository';
import { UnifiedOrder } from '../../src/core/types/order.types';

const makeOrder = (id: string, overrides: Partial<UnifiedOrder> = {}): UnifiedOrder => ({
  marketplace: 'MOCK',
  marketplaceOrderId: id,
  packageId: `PKG-${id}`,
  customerName: 'Test',
  items: [],
  totalPrice: 100,
  currency: 'TRY',
  status: 'PENDING',
  rawStatus: 'pending',
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
  rawPayload: {},
  ...overrides,
});

describe('InMemoryOrderRepository', () => {
  it('should save and retrieve an order', async () => {
    const repo = new InMemoryOrderRepository();
    const order = makeOrder('001');
    await repo.save(order);
    const found = await repo.findById('MOCK_001');
    expect(found).toEqual(order);
  });

  it('should return null for unknown ID', async () => {
    const repo = new InMemoryOrderRepository();
    expect(await repo.findById('nope')).toBeNull();
  });

  it('should save batch', async () => {
    const repo = new InMemoryOrderRepository();
    await repo.saveBatch([makeOrder('A'), makeOrder('B'), makeOrder('C')]);
    const all = await repo.findAll();
    expect(all).toHaveLength(3);
  });

  it('should filter by marketplace', async () => {
    const repo = new InMemoryOrderRepository();
    await repo.saveBatch([
      makeOrder('1', { marketplace: 'TRENDYOL' }),
      makeOrder('2', { marketplace: 'MOCK' }),
    ]);
    const result = await repo.findAll({ marketplace: 'TRENDYOL' });
    expect(result).toHaveLength(1);
    expect(result[0].marketplace).toBe('TRENDYOL');
  });

  it('should filter by status', async () => {
    const repo = new InMemoryOrderRepository();
    await repo.saveBatch([
      makeOrder('1', { status: 'SHIPPED' }),
      makeOrder('2', { status: 'PENDING' }),
    ]);
    const result = await repo.findAll({ status: 'SHIPPED' });
    expect(result).toHaveLength(1);
  });

  it('should delete an order', async () => {
    const repo = new InMemoryOrderRepository();
    await repo.save(makeOrder('DEL'));
    await repo.delete('MOCK_DEL');
    expect(await repo.findById('MOCK_DEL')).toBeNull();
  });

  it('should count orders', async () => {
    const repo = new InMemoryOrderRepository();
    await repo.saveBatch([makeOrder('1'), makeOrder('2')]);
    expect(await repo.count()).toBe(2);
  });
});
