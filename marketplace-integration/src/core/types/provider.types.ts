import { MarketplaceType } from './order.types';

export interface MarketplaceCredentials {
  readonly marketplace: MarketplaceType;
  readonly isConfigured: boolean;
}

export interface TrendyolCredentials extends MarketplaceCredentials {
  readonly marketplace: 'TRENDYOL';
  readonly sellerId?: string;
  readonly apiKey?: string;
  readonly apiSecret?: string;
}

export interface HepsiburadaCredentials extends MarketplaceCredentials {
  readonly marketplace: 'HEPSIBURADA';
  readonly merchantId?: string;
  readonly apiKey?: string;
}

export interface N11Credentials extends MarketplaceCredentials {
  readonly marketplace: 'N11';
  readonly appKey?: string;
  readonly appSecret?: string;
}

export interface AmazonCredentials extends MarketplaceCredentials {
  readonly marketplace: 'AMAZON';
  readonly sellerId?: string;
  readonly mwsAuthToken?: string;
}

export interface CicekSepetiCredentials extends MarketplaceCredentials {
  readonly marketplace: 'CICEKSEPETI';
  readonly apiKey?: string;
}

export type ProviderCredentials =
  | TrendyolCredentials
  | HepsiburadaCredentials
  | N11Credentials
  | AmazonCredentials
  | CicekSepetiCredentials;

export interface ProviderHealthStatus {
  marketplace: MarketplaceType;
  status: 'OK' | 'ERROR' | 'DEGRADED';
  latencyMs: number;
  message?: string;
  lastChecked: string;
}
