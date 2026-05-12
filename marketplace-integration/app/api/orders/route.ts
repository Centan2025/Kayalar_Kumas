import { NextResponse } from 'next/server';
import { orderSyncService } from '@/services/order-sync/order-sync.service';
import { MarketplaceType, OrderStatus } from '@/core/types/order.types';
import { OrdersResponse } from '@/core/types/api.types';
import { Logger } from '@/services/logger/logger.service';

export async function GET(request: Request): Promise<NextResponse<OrdersResponse>> {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const marketplace = searchParams.get('marketplace') as MarketplaceType | null;
  const status = searchParams.get('status') as OrderStatus | null;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

  Logger.info('[API] GET /api/orders', { marketplace, status, page, limit });

  try {
    const filters: Record<string, unknown> = {};
    if (marketplace) filters.marketplace = marketplace;
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    let orders = await orderSyncService.getOrders(filters);

    // Date filtering
    if (dateFrom) {
      const from = new Date(dateFrom);
      orders = orders.filter((o) => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      orders = orders.filter((o) => new Date(o.createdAt) <= to);
    }

    // Pagination
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paged = orders.slice(start, start + limit);

    Logger.info('[API] GET /api/orders complete', {
      total,
      returned: paged.length,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: paged,
      meta: { page, limit, total, totalPages },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('[API] GET /api/orders failed', { error: errMsg });

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: { code: 'INTERNAL_ERROR', message: errMsg },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
