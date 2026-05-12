import { NextResponse } from 'next/server';
import { orderSyncService } from '@/services/order-sync/order-sync.service';
import { MarketplaceType } from '@/core/types/order.types';
import { SyncResponse } from '@/core/types/api.types';
import { Logger } from '@/services/logger/logger.service';

interface SyncRequestBody {
  marketplaces?: MarketplaceType[];
  forceFullSync?: boolean;
}

export async function POST(request: Request): Promise<NextResponse<SyncResponse>> {
  Logger.info('[API] POST /api/sync');

  try {
    let body: SyncRequestBody = {};
    try {
      body = (await request.json()) as SyncRequestBody;
    } catch {
      // Empty body is valid — sync all
    }

    const result = await orderSyncService.syncAll({
      marketplaces: body.marketplaces,
      forceFullSync: body.forceFullSync,
    });

    Logger.info('[API] POST /api/sync complete', {
      totalSynced: result.totalSynced,
      totalErrors: result.totalErrors,
      durationMs: result.totalDuration,
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('[API] POST /api/sync failed', { error: errMsg });

    return NextResponse.json(
      {
        success: false,
        data: null as unknown as SyncResponse['data'],
        error: { code: 'SYNC_FAILED', message: errMsg },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
