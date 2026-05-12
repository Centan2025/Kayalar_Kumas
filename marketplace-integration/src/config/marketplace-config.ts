import { MarketplaceType } from '../core/types/order.types';

export interface MarketplaceConfig {
  name: MarketplaceType;
  displayName: string;
  baseUrl: string;
  enabled: boolean;
  rateLimit: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  timeout: number;
}

export const MARKETPLACE_CONFIGS: Record<MarketplaceType, MarketplaceConfig> = {
  TRENDYOL: {
    name: 'TRENDYOL',
    displayName: 'Trendyol',
    baseUrl: 'https://api.trendyol.com/sapigw',
    enabled: true,
    rateLimit: { requestsPerSecond: 10, burstLimit: 20 },
    timeout: 30_000,
  },
  HEPSIBURADA: {
    name: 'HEPSIBURADA',
    displayName: 'Hepsiburada',
    baseUrl: 'https://mpop-sit.hepsiburada.com',
    enabled: true,
    rateLimit: { requestsPerSecond: 5, burstLimit: 10 },
    timeout: 30_000,
  },
  N11: {
    name: 'N11',
    displayName: 'N11',
    baseUrl: 'https://api.n11.com/ws',
    enabled: true,
    rateLimit: { requestsPerSecond: 5, burstLimit: 10 },
    timeout: 30_000,
  },
  AMAZON: {
    name: 'AMAZON',
    displayName: 'Amazon Marketplace',
    baseUrl: 'https://sellingpartnerapi-eu.amazon.com',
    enabled: true,
    rateLimit: { requestsPerSecond: 2, burstLimit: 5 },
    timeout: 45_000,
  },
  CICEKSEPETI: {
    name: 'CICEKSEPETI',
    displayName: 'ÇiçekSepeti',
    baseUrl: 'https://apis.ciceksepeti.com/api',
    enabled: true,
    rateLimit: { requestsPerSecond: 5, burstLimit: 10 },
    timeout: 30_000,
  },
  MOCK: {
    name: 'MOCK',
    displayName: 'Mock Provider',
    baseUrl: 'http://localhost',
    enabled: true,
    rateLimit: { requestsPerSecond: 100, burstLimit: 200 },
    timeout: 5_000,
  },
};
