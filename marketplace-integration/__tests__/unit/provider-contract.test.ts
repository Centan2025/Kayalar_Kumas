import { describe, it, expect } from 'vitest';
import { TrendyolProvider } from '../../src/providers/trendyol/trendyol.provider';
import { HepsiburadaProvider } from '../../src/providers/hepsiburada/hepsiburada.provider';
import { N11Provider } from '../../src/providers/n11/n11.provider';
import { AmazonProvider } from '../../src/providers/amazon/amazon.provider';
import { CicekSepetiProvider } from '../../src/providers/ciceksepeti/ciceksepeti.provider';

/**
 * Provider contract tests.
 * Every provider must implement the same interface consistently.
 */
describe('Provider Contract Tests', () => {
  const providers = [
    { name: 'Trendyol', Provider: TrendyolProvider, expected: 'TRENDYOL' },
    { name: 'Hepsiburada', Provider: HepsiburadaProvider, expected: 'HEPSIBURADA' },
    { name: 'N11', Provider: N11Provider, expected: 'N11' },
    { name: 'Amazon', Provider: AmazonProvider, expected: 'AMAZON' },
    { name: 'CicekSepeti', Provider: CicekSepetiProvider, expected: 'CICEKSEPETI' },
  ] as const;

  for (const { name, Provider, expected } of providers) {
    describe(name, () => {
      const provider = new Provider();

      it(`should have name = ${expected}`, () => {
        expect(provider.name).toBe(expected);
      });

      it('should implement getOrders', () => {
        expect(typeof provider.getOrders).toBe('function');
      });

      it('should implement getOrderById', () => {
        expect(typeof provider.getOrderById).toBe('function');
      });

      it('should implement normalizeOrder', () => {
        expect(typeof provider.normalizeOrder).toBe('function');
      });

      it('should implement validateCredentials', () => {
        expect(typeof provider.validateCredentials).toBe('function');
      });

      it('should implement healthCheck', () => {
        expect(typeof provider.healthCheck).toBe('function');
      });

      it('should implement syncOrders', () => {
        expect(typeof provider.syncOrders).toBe('function');
      });

      it('should return false for validateCredentials without env vars', async () => {
        // Without real env vars, credentials should not be valid
        const isValid = await provider.validateCredentials();
        expect(isValid).toBe(false);
      });

      it('should return ERROR for healthCheck without credentials', async () => {
        const health = await provider.healthCheck();
        expect(health.status).toBe('ERROR');
      });
    });
  }
});
