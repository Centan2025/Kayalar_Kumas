import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Trendyol
  TRENDYOL_SELLER_ID: z.string().optional(),
  TRENDYOL_API_KEY: z.string().optional(),
  TRENDYOL_API_SECRET: z.string().optional(),

  // Hepsiburada
  HEPSIBURADA_MERCHANT_ID: z.string().optional(),
  HEPSIBURADA_API_KEY: z.string().optional(),

  // N11
  N11_APP_KEY: z.string().optional(),
  N11_APP_SECRET: z.string().optional(),

  // Amazon
  AMAZON_SELLER_ID: z.string().optional(),
  AMAZON_MWS_AUTH_TOKEN: z.string().optional(),

  // CicekSepeti
  CICEKSEPETI_API_KEY: z.string().optional(),

  // App Settings
  SYNC_INTERVAL_MS: z.string().transform(Number).default('300000'), // 5 min
  RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  BATCH_SIZE: z.string().transform(Number).default('50'),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
