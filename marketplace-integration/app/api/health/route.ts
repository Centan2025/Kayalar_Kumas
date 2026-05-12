import { NextResponse } from 'next/server';
import { MarketplaceProviderFactory } from '@/providers/factory';
import { HealthResponse } from '@/core/types/api.types';
import { ProviderHealthStatus } from '@/core/types/provider.types';
import { Logger } from '@/services/logger/logger.service';

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  Logger.info('[API] GET /api/health');

  const providers = MarketplaceProviderFactory.getAllProviders();
  const healthChecks: ProviderHealthStatus[] = [];

  const settled = await Promise.allSettled(
    providers.map(async (provider) => {
      const checkStart = Date.now();
      try {
        const result = await provider.healthCheck();
        return {
          marketplace: provider.name,
          status: result.status,
          latencyMs: Date.now() - checkStart,
          message: result.message,
          lastChecked: new Date().toISOString(),
        } satisfies ProviderHealthStatus;
      } catch (error) {
        return {
          marketplace: provider.name,
          status: 'ERROR' as const,
          latencyMs: Date.now() - checkStart,
          message: error instanceof Error ? error.message : 'Health check failed',
          lastChecked: new Date().toISOString(),
        } satisfies ProviderHealthStatus;
      }
    })
  );

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      healthChecks.push(outcome.value);
    }
  }

  const hasErrors = healthChecks.some((h) => h.status === 'ERROR');
  const allErrors = healthChecks.every((h) => h.status === 'ERROR');

  const overallStatus = allErrors ? 'unhealthy' : hasErrors ? 'degraded' : 'healthy';

  return NextResponse.json({
    success: true,
    data: {
      status: overallStatus,
      providers: healthChecks,
      uptime: Date.now() - startTime,
    },
    timestamp: new Date().toISOString(),
  });
}
