import { describe, it, expect } from 'vitest';
import { MarketplaceProviderFactory } from '../../src/providers/factory';

describe('MarketplaceProviderFactory', () => {
  it('should return MockProvider for MOCK type', () => {
    const provider = MarketplaceProviderFactory.getProvider('MOCK');
    expect(provider.name).toBe('MOCK');
  });

  it('should fallback to MockProvider when credentials are missing in dev', () => {
    // In test env (not production), missing credentials => MockProvider
    MarketplaceProviderFactory.clearCache();
    const provider = MarketplaceProviderFactory.getProvider('TRENDYOL');
    // Without credentials, falls back to MOCK
    expect(provider.name).toBe('MOCK');
  });

  it('should return all providers via getAllProviders', () => {
    MarketplaceProviderFactory.clearCache();
    const providers = MarketplaceProviderFactory.getAllProviders();
    expect(providers.length).toBe(5);
  });

  it('should cache provider instances', () => {
    MarketplaceProviderFactory.clearCache();
    const a = MarketplaceProviderFactory.getProvider('TRENDYOL');
    const b = MarketplaceProviderFactory.getProvider('TRENDYOL');
    expect(a).toBe(b);
  });
});
