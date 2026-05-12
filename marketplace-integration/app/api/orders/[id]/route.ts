import { NextResponse } from 'next/server';
import { orderSyncService } from '@/services/order-sync/order-sync.service';
import { OrderResponse } from '@/core/types/api.types';
import { Logger } from '@/services/logger/logger.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse<OrderResponse>> {
  const { id } = await params;
  Logger.info('[API] GET /api/orders/:id', { id });

  try {
    const order = await orderSyncService.getOrderById(id);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          data: null as unknown as OrderResponse['data'],
          error: { code: 'NOT_FOUND', message: `Order ${id} not found` },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('[API] GET /api/orders/:id failed', { error: errMsg, id });

    return NextResponse.json(
      {
        success: false,
        data: null as unknown as OrderResponse['data'],
        error: { code: 'INTERNAL_ERROR', message: errMsg },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
