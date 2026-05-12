import { MarketplaceType } from '../core/types/order.types';
import { MarketplaceProvider } from '../core/interfaces/marketplace-provider.interface';
import { TrendyolProvider } from './trendyol/trendyol.provider';
import { HepsiburadaProvider } from './hepsiburada/hepsiburada.provider';
import { N11Provider } from './n11/n11.provider';
import { AmazonProvider } from './amazon/amazon.provider';
import { CicekSepetiProvider } from './ciceksepeti/ciceksepeti.provider';
import { MockProvider } from './mock/mock.provider';
import { Logger } from '../services/logger/logger.service';

type ProviderConstructor = new () => MarketplaceProvider;

const PROVIDER_REGISTRY: Record<Exclude<MarketplaceType, 'MOCK'>, ProviderConstructor> = {
  TRENDYOL: TrendyolProvider,
  HEPSIBURADA: HepsiburadaProvider,
  N11: N11Provider,
  AMAZON: AmazonProvider,
  CICEKSEPETI: CicekSepetiProvider,
};

/**
 * Credential environment variable keys per marketplace.
 * If none of these env vars are set, the factory falls back to MockProvider.
 */
const CREDENTIAL_KEYS: Record<Exclude<MarketplaceType, 'MOCK'>, string[]> = {
  TRENDYOL: ['TRENDYOL_API_KEY', 'TRENDYOL_API_SECRET', 'TRENDYOL_SELLER_ID'],
  HEPSIBURADA: ['HEPSIBURADA_MERCHANT_ID', 'HEPSIBURADA_API_KEY'],
  N11: ['N11_APP_KEY', 'N11_APP_SECRET'],
  AMAZON: ['AMAZON_SELLER_ID', 'AMAZON_MWS_AUTH_TOKEN'],
  CICEKSEPETI: ['CICEKSEPETI_API_KEY'],
};

export class MarketplaceProviderFactory {
  private static instances = new Map<MarketplaceType, MarketplaceProvider>();

  /**
   * Returns a provider instance. Falls back to MockProvider if credentials
   * are missing and NODE_ENV !== 'production'.
   */
  static getProvider(type: MarketplaceType): MarketplaceProvider {
    if (type === 'MOCK') return new MockProvider();

    const cached = MarketplaceProviderFactory.instances.get(type);
    if (cached) return cached;

    const hasCredentials = MarketplaceProviderFactory.checkCredentials(type);

    if (!hasCredentials && process.env.NODE_ENV !== 'production') {
      Logger.warn(`[Factory] No credentials for ${type} — falling back to MockProvider`);
      const mock = new MockProvider();
      MarketplaceProviderFactory.instances.set(type, mock);
      return mock;
    }

    const Constructor = PROVIDER_REGISTRY[type];
    if (!Constructor) {
      Logger.error(`[Factory] Unknown marketplace type: ${type}`);
      return new MockProvider();
    }

    const instance = new Constructor();
    MarketplaceProviderFactory.instances.set(type, instance);
    return instance;
  }

  static getAllProviders(): MarketplaceProvider[] {
    const types: Array<Exclude<MarketplaceType, 'MOCK'>> = [
      'TRENDYOL', 'HEPSIBURADA', 'N11', 'AMAZON', 'CICEKSEPETI',
    ];
    return types.map((t) => MarketplaceProviderFactory.getProvider(t));
  }

  static clearCache(): void {
    MarketplaceProviderFactory.instances.clear();
  }

  private static checkCredentials(type: Exclude<MarketplaceType, 'MOCK'>): boolean {
    const keys = CREDENTIAL_KEYS[type];
    return keys.every((key) => !!process.env[key]);
  }
}
