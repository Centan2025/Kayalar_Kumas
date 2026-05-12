import { supabase } from './supabase';

export type OrderSource = 'MANUAL' | 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'CICEKSEPETI';

export const SOURCE_LABELS: Record<OrderSource, { label: string; color: string }> = {
  MANUAL: { label: 'Elle Giriş', color: '#64748b' },
  TRENDYOL: { label: 'Trendyol', color: '#f97316' },
  HEPSIBURADA: { label: 'Hepsiburada', color: '#f59e0b' },
  N11: { label: 'N11', color: '#a78bfa' },
  AMAZON: { label: 'Amazon', color: '#3b82f6' },
  CICEKSEPETI: { label: 'ÇiçekSepeti', color: '#ec4899' },
};

interface MarketplaceOrderItem {
  sku: string;
  barcode: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

interface MarketplaceOrder {
  marketplace: string;
  marketplaceOrderId: string;
  customerName: string;
  customerPhone?: string;
  items: MarketplaceOrderItem[];
  totalPrice: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface ProductionOrderInput {
  fabricCode: string;
  mechanism: string;
  width: number;
  height: number;
  pileRatio: number;
  parts: number;
  notes: string;
  deliveryDate: string | null;
  customerCity: string;
  customerAddress: string;
}

/**
 * Marketplace siparişini üretim siparişine dönüştürüp Supabase'e kaydeder.
 */
export async function convertMarketplaceToProduction(
  mpOrder: MarketplaceOrder,
  productionInput: ProductionOrderInput
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // Aynı marketplace siparişi daha önce dönüştürülmüş mü?
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('marketplace_order_id', mpOrder.marketplaceOrderId)
      .eq('source', mpOrder.marketplace)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Bu marketplace siparişi zaten üretime alınmış.' };
    }

    const orderId = `MP-${mpOrder.marketplace.substring(0, 3)}-${Date.now().toString().slice(-6)}`;

    const orderRow = {
      id: orderId,
      customer_name: mpOrder.customerName,
      customer_phone: mpOrder.customerPhone ?? '',
      customer_address: productionInput.customerAddress,
      customer_city: productionInput.customerCity,
      invoice_name: mpOrder.customerName,
      invoice_tax_no: '',
      invoice_address: productionInput.customerAddress,
      fabric_code: productionInput.fabricCode,
      mechanism: productionInput.mechanism,
      width: productionInput.width,
      height: productionInput.height,
      pile_ratio: productionInput.pileRatio,
      status: 'PENDING',
      notes: productionInput.notes,
      delivery_date: productionInput.deliveryDate,
      parts: productionInput.parts,
      // Marketplace specific
      source: mpOrder.marketplace,
      marketplace_order_id: mpOrder.marketplaceOrderId,
      marketplace_data: {
        originalStatus: mpOrder.status,
        totalPrice: mpOrder.totalPrice,
        currency: mpOrder.currency,
        items: mpOrder.items,
        syncedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from('orders').insert(orderRow);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, orderId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return { success: false, error: message };
  }
}

/**
 * Bir marketplace siparişinin daha önce üretime alınıp alınmadığını kontrol eder.
 */
export async function checkIfAlreadyConverted(
  marketplace: string,
  marketplaceOrderId: string
): Promise<{ converted: boolean; orderId?: string }> {
  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('marketplace_order_id', marketplaceOrderId)
    .eq('source', marketplace)
    .maybeSingle();

  return { converted: !!data, orderId: data?.id };
}
