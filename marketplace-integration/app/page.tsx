'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderItem {
  sku: string;
  barcode: string;
  title: string;
  quantity: number;
  unitPrice: number;
}

interface UnifiedOrder {
  marketplace: string;
  marketplaceOrderId: string;
  packageId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalPrice: number;
  currency: string;
  status: string;
  rawStatus: string;
  shipmentTrackingNumber?: string;
  cargoCompany?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderHealth {
  marketplace: string;
  status: 'OK' | 'ERROR' | 'DEGRADED';
  latencyMs: number;
  message?: string;
}

interface SyncResultItem {
  marketplace: string;
  synced: number;
  errors: number;
  skipped: number;
  duration: number;
}

type MarketplaceFilter = 'ALL' | 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'CICEKSEPETI' | 'MOCK';
type StatusFilter = 'ALL' | 'PENDING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const MARKETPLACE_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  N11: 'N11',
  AMAZON: 'Amazon',
  CICEKSEPETI: 'ÇiçekSepeti',
  MOCK: 'Mock',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  READY_TO_SHIP: 'Hazır',
  SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim',
  CANCELLED: 'İptal',
  RETURNED: 'İade',
  UNKNOWN: 'Bilinmiyor',
};

function getStatusClass(status: string): string {
  switch (status) {
    case 'PENDING': return 'pending';
    case 'READY_TO_SHIP': return 'ready';
    case 'SHIPPED': return 'shipped';
    case 'DELIVERED': return 'delivered';
    case 'CANCELLED':
    case 'RETURNED': return 'cancelled';
    default: return 'pending';
  }
}

function getMpDotClass(mp: string): string {
  return mp.toLowerCase().replace('ç', 'c').replace('ş', 's');
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency === 'TRY' ? 'TRY' : currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [healthData, setHealthData] = useState<ProviderHealth[]>([]);
  const [overallHealth, setOverallHealth] = useState<string>('healthy');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultItem[] | null>(null);
  const [mpFilter, setMpFilter] = useState<MarketplaceFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (mpFilter !== 'ALL') params.set('marketplace', mpFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [mpFilter, statusFilter]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      if (json.success) {
        setHealthData(json.data.providers);
        setOverallHealth(json.data.status);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchHealth();
  }, [fetchOrders, fetchHealth]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(json.data.results);
        await fetchOrders();
        await fetchHealth();
      }
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  // Stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED' || o.status === 'DELIVERED').length;
  const uniqueMarketplaces = new Set(orders.map((o) => o.marketplace)).size;

  return (
    <div className="dashboard">
      {/* ─── Header ─── */}
      <header className="dashboard-header">
        <div className="dashboard-title">
          <div className="logo-icon">📦</div>
          <h1>Marketplace Hub</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => { fetchOrders(); fetchHealth(); }}>
            ↻ Yenile
          </button>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
            {syncing ? '⏳ Senkronize ediliyor...' : '⚡ Sync Başlat'}
          </button>
        </div>
      </header>

      {/* ─── Health Badges ─── */}
      <div className="health-grid">
        <div className="health-badge">
          <span
            className={`health-dot ${overallHealth === 'healthy' ? 'ok' : overallHealth === 'degraded' ? 'degraded' : 'error'}`}
          />
          Sistem: {overallHealth === 'healthy' ? 'Sağlıklı' : overallHealth === 'degraded' ? 'Kısmi' : 'Hatalı'}
        </div>
        {healthData.map((h) => (
          <div key={h.marketplace} className="health-badge">
            <span className={`health-dot ${h.status === 'OK' ? 'ok' : 'error'}`} />
            {MARKETPLACE_LABELS[h.marketplace] ?? h.marketplace}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              {h.latencyMs}ms
            </span>
          </div>
        ))}
      </div>

      {/* ─── Stats ─── */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Toplam Sipariş</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-sub">{uniqueMarketplaces} marketplace</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Toplam Ciro</div>
          <div className="stat-value">{formatPrice(totalRevenue, 'TRY')}</div>
          <div className="stat-sub">Tüm siparişler</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Bekleyen</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-sub">İşlem bekliyor</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Kargo / Teslim</div>
          <div className="stat-value">{shippedCount}</div>
          <div className="stat-sub">Gönderilmiş</div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="filters-bar">
        {(['ALL', 'TRENDYOL', 'HEPSIBURADA', 'N11', 'AMAZON', 'CICEKSEPETI', 'MOCK'] as MarketplaceFilter[]).map((f) => (
          <button
            key={f}
            className={`filter-chip ${mpFilter === f ? 'active' : ''}`}
            onClick={() => setMpFilter(f)}
          >
            {f === 'ALL' ? 'Tümü' : MARKETPLACE_LABELS[f] ?? f}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        {(['ALL', 'PENDING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'Tüm Durum' : STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* ─── Orders Table ─── */}
      <div className="table-container">
        <div className="table-header">
          <h2>Siparişler</h2>
          <span className="table-count">{orders.length} kayıt</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p>Yükleniyor...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <h3>Sipariş bulunamadı</h3>
            <p>Sync başlatarak marketplace siparişlerini çekebilirsiniz</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Ürünler</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={`${order.marketplace}_${order.marketplaceOrderId}`}>
                  <td>
                    <span className="mp-pill">
                      <span className={`mp-dot ${getMpDotClass(order.marketplace)}`} />
                      {MARKETPLACE_LABELS[order.marketplace] ?? order.marketplace}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {order.marketplaceOrderId}
                  </td>
                  <td>{order.customerName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {order.items.length} kalem
                  </td>
                  <td>
                    <span className="price">{formatPrice(order.totalPrice, order.currency)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {formatDate(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Sync Toast ─── */}
      {syncing && (
        <div className="sync-toast">
          <div className="spinner" />
          Marketplace&apos;ler senkronize ediliyor...
        </div>
      )}

      {syncResult && !syncing && (
        <div className="sync-toast" onClick={() => setSyncResult(null)} style={{ cursor: 'pointer' }}>
          ✅ Sync tamamlandı —{' '}
          {syncResult.reduce((s, r) => s + r.synced, 0)} sipariş senkronize edildi
        </div>
      )}
    </div>
  );
}
