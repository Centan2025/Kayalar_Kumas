import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Zap, Activity, Package, TrendingUp, Clock, XCircle, Truck, CheckCircle, AlertCircle, X, ArrowRight } from 'lucide-react';
import { convertMarketplaceToProduction } from '../lib/marketplaceOrderService';

/* ─── Types ─── */
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
  items: OrderItem[];
  totalPrice: number;
  currency: string;
  status: string;
  rawStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderHealth {
  marketplace: string;
  status: 'OK' | 'ERROR' | 'DEGRADED';
  latencyMs: number;
}

interface SyncResultItem {
  marketplace: string;
  synced: number;
  errors: number;
  skipped: number;
  duration: number;
}

/* ─── Constants ─── */
const MARKETPLACE_API = 'http://localhost:3002';

type MarketplaceFilter = 'ALL' | 'TRENDYOL' | 'HEPSIBURADA' | 'N11' | 'AMAZON' | 'CICEKSEPETI' | 'MOCK';
type StatusFilter = 'ALL' | 'PENDING' | 'READY_TO_SHIP' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const MP_LABELS: Record<string, string> = {
  TRENDYOL: 'Trendyol', HEPSIBURADA: 'Hepsiburada', N11: 'N11',
  AMAZON: 'Amazon', CICEKSEPETI: 'ÇiçekSepeti', MOCK: 'Mock',
};

const MP_COLORS: Record<string, string> = {
  TRENDYOL: '#f97316', HEPSIBURADA: '#f59e0b', N11: '#a78bfa',
  AMAZON: '#3b82f6', CICEKSEPETI: '#ec4899', MOCK: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', READY_TO_SHIP: 'Hazır', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim', CANCELLED: 'İptal', RETURNED: 'İade', UNKNOWN: 'Bilinmiyor',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  READY_TO_SHIP: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  SHIPPED: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa' },
  DELIVERED: { bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  RETURNED: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  UNKNOWN: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock size={12} />,
  READY_TO_SHIP: <Package size={12} />,
  SHIPPED: <Truck size={12} />,
  DELIVERED: <CheckCircle size={12} />,
  CANCELLED: <XCircle size={12} />,
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency === 'TRY' ? 'TRY' : currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/* ─── Component ─── */
export default function MarketplaceDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [healthData, setHealthData] = useState<ProviderHealth[]>([]);
  const [overallHealth, setOverallHealth] = useState('healthy');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultItem[] | null>(null);
  const [mpFilter, setMpFilter] = useState<MarketplaceFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [convertOrder, setConvertOrder] = useState<UnifiedOrder | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState<{ok: boolean; text: string} | null>(null);
  const [prodForm, setProdForm] = useState({
    fabricCode: '', mechanism: 'Manuel', width: '', height: '',
    pileRatio: '1.0', parts: '1', notes: '', deliveryDate: '',
    customerCity: '', customerAddress: '',
  });

  const handleConvert = async () => {
    if (!convertOrder) return;
    setConverting(true);
    setConvertMsg(null);
    const result = await convertMarketplaceToProduction(
      {
        marketplace: convertOrder.marketplace,
        marketplaceOrderId: convertOrder.marketplaceOrderId,
        customerName: convertOrder.customerName,
        items: convertOrder.items,
        totalPrice: convertOrder.totalPrice,
        currency: convertOrder.currency,
        status: convertOrder.status,
        createdAt: convertOrder.createdAt,
      },
      {
        fabricCode: prodForm.fabricCode,
        mechanism: prodForm.mechanism,
        width: parseFloat(prodForm.width) || 0,
        height: parseFloat(prodForm.height) || 0,
        pileRatio: parseFloat(prodForm.pileRatio) || 1,
        parts: parseInt(prodForm.parts) || 1,
        notes: prodForm.notes,
        deliveryDate: prodForm.deliveryDate || null,
        customerCity: prodForm.customerCity,
        customerAddress: prodForm.customerAddress,
      }
    );
    setConverting(false);
    if (result.success) {
      setConvertMsg({ ok: true, text: `Sipariş üretime alındı: ${result.orderId}` });
      setTimeout(() => { setConvertOrder(null); setConvertMsg(null); }, 2000);
    } else {
      setConvertMsg({ ok: false, text: result.error ?? 'Hata oluştu' });
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (mpFilter !== 'ALL') params.set('marketplace', mpFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('limit', '100');
      const res = await fetch(`${MARKETPLACE_API}/api/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch {
      /* API down — show empty */
    } finally {
      setLoading(false);
    }
  }, [mpFilter, statusFilter]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${MARKETPLACE_API}/api/health`);
      const json = await res.json();
      if (json.success) {
        setHealthData(json.data.providers);
        setOverallHealth(json.data.status);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('search');
    if (s) setSearchTerm(s);
    
    fetchOrders();
    fetchHealth();
  }, [fetchOrders, fetchHealth]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${MARKETPLACE_API}/api/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSyncResult(json.data.results);
        setLastSync(new Date().toLocaleTimeString('tr-TR'));
        await fetchOrders();
        await fetchHealth();
      }
    } catch { /* silent */ }
    finally { setSyncing(false); }
  };

  const filteredOrders = orders.filter(o => 
    !searchTerm || 
    o.marketplaceOrderId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((s, o) => s + o.totalPrice, 0);
  const pendingCount = filteredOrders.filter(o => o.status === 'PENDING').length;
  const shippedCount = filteredOrders.filter(o => ['SHIPPED', 'DELIVERED'].includes(o.status)).length;

  return (
    <div>
      {/* ─── Header ─── */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="button button-outline"
            style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
            🛒
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0 }}>Marketplace Hub</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Çoklu Pazaryeri Sipariş Yönetimi
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {lastSync && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
              Son sync: {lastSync}
            </span>
          )}
          <button className="button button-outline" onClick={() => { fetchOrders(); fetchHealth(); }} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button className="button" onClick={handleSync} disabled={syncing} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {syncing ? <><span className="mp-spinner" /> Senkronize ediliyor...</> : <><Zap size={14} /> Sync Başlat</>}
          </button>
        </div>
      </header>

      <main className="container animate-fade-in" style={{ marginTop: '1.5rem' }}>
        {/* ─── Health Badges ─── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="badge" style={{
            background: overallHealth === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: overallHealth === 'healthy' ? '#10b981' : '#ef4444',
            border: `1px solid ${overallHealth === 'healthy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            padding: '0.35rem 0.75rem', gap: '0.4rem',
          }}>
            <Activity size={12} />
            {overallHealth === 'healthy' ? 'Sistem Sağlıklı' : 'Sistem Hatalı'}
          </div>
          {healthData.map((h, idx) => (
            <div key={`health-${idx}-${h.marketplace}`} className="badge" style={{
              background: h.status === 'OK' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              color: h.status === 'OK' ? '#10b981' : '#ef4444',
              border: `1px solid ${h.status === 'OK' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
              padding: '0.35rem 0.75rem', gap: '0.4rem',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: h.status === 'OK' ? '#10b981' : '#ef4444', display: 'inline-block' }} />
              {MP_LABELS[h.marketplace] ?? h.marketplace}
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{h.latencyMs}ms</span>
            </div>
          ))}
        </div>

        {/* ─── Stats Cards ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Toplam Sipariş', value: totalOrders, icon: <Package size={20} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            { label: 'Toplam Ciro', value: formatPrice(totalRevenue, 'TRY'), icon: <TrendingUp size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Bekleyen', value: pendingCount, icon: <Clock size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Kargo/Teslim', value: shippedCount, icon: <Truck size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '1.25rem', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ─── Filters ─── */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['ALL', 'TRENDYOL', 'HEPSIBURADA', 'N11', 'AMAZON', 'CICEKSEPETI', 'MOCK'] as MarketplaceFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setMpFilter(f)}
              className="badge"
              style={{
                cursor: 'pointer', border: 'none', fontSize: '0.78rem', fontWeight: 600, padding: '0.4rem 0.8rem',
                background: mpFilter === f ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.08)',
                color: mpFilter === f ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {f !== 'ALL' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: MP_COLORS[f], display: 'inline-block', marginRight: 4 }} />}
              {f === 'ALL' ? 'Tümü' : MP_LABELS[f]}
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 0.25rem' }} />
          {(['ALL', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="badge"
              style={{
                cursor: 'pointer', border: 'none', fontSize: '0.78rem', fontWeight: 600, padding: '0.4rem 0.8rem',
                background: statusFilter === s ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.08)',
                color: statusFilter === s ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s ease',
              }}
            >
              {s === 'ALL' ? 'Tüm Durum' : STATUS_LABELS[s]}
            </button>
          ))}
          <div style={{ flex: '1', minWidth: '200px', position: 'relative', marginLeft: 'auto' }}>
            <Activity size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              className="input" 
              placeholder="Sipariş No veya Müşteri Ara..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.2rem', paddingRight: '2rem', height: '36px', fontSize: '0.85rem' }} 
            />
            {searchTerm && <X size={14} onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '10px', cursor: 'pointer', color: 'var(--text-muted)' }} />}
          </div>
        </div>

        {/* ─── Orders Table ─── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Siparişler</h2>
            <span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              {orders.length} kayıt
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <span className="mp-spinner" style={{ width: 24, height: 24, margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <AlertCircle size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Sipariş bulunamadı
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                &quot;Sync Başlat&quot; butonuyla marketplace siparişlerini çekebilirsiniz
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={`${order.marketplace}_${order.marketplaceOrderId}`}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: MP_COLORS[order.marketplace] ?? '#64748b' }} />
                          {MP_LABELS[order.marketplace] ?? order.marketplace}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {order.marketplaceOrderId}
                      </td>
                      <td>{order.customerName}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{order.items.length} kalem</td>
                      <td>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatPrice(order.totalPrice, order.currency)}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: STATUS_COLORS[order.status]?.bg ?? STATUS_COLORS.UNKNOWN.bg,
                          color: STATUS_COLORS[order.status]?.text ?? STATUS_COLORS.UNKNOWN.text,
                          border: 'none', gap: 4, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em',
                        }}>
                          {STATUS_ICONS[order.status]}
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td>
                        <button
                          className="badge"
                          style={{ cursor: 'pointer', border: 'none', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.72rem', padding: '0.35rem 0.6rem', gap: 4 }}
                          onClick={() => { setConvertOrder(order); setConvertMsg(null); setProdForm({ fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '1.0', parts: '1', notes: `Marketplace: ${MP_LABELS[order.marketplace]} #${order.marketplaceOrderId}`, deliveryDate: '', customerCity: '', customerAddress: '' }); }}
                        >
                          <ArrowRight size={10} /> Üretime Al
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Sync Result Summary ─── */}
        {syncResult && !syncing && (
          <div className="card" style={{ marginTop: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setSyncResult(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={18} style={{ color: '#10b981' }} />
              <span style={{ fontWeight: 600 }}>
                Sync tamamlandı — {syncResult.reduce((s, r) => s + r.synced, 0)} sipariş senkronize edildi
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kapat ✕</span>
          </div>
        )}
      </main>

      {/* ─── Syncing Overlay Toast ─── */}
      {syncing && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: 'var(--card-bg)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem',
          animation: 'fadeIn 0.3s ease', zIndex: 100,
        }}>
          <span className="mp-spinner" />
          Marketplace&apos;ler senkronize ediliyor...
        </div>
      )}

      {/* ─── Üretime Al Modal ─── */}
      {convertOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Üretime Al</h2>
              <button onClick={() => setConvertOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div className="badge" style={{ marginBottom: '1rem', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.8rem', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: MP_COLORS[convertOrder.marketplace] ?? '#64748b' }} />
              {MP_LABELS[convertOrder.marketplace]} — #{convertOrder.marketplaceOrderId} — {convertOrder.customerName}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Kumaş Kodu *</label><input className="input" value={prodForm.fabricCode} onChange={e => setProdForm({...prodForm, fabricCode: e.target.value})} required /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>En (cm) *</label><input type="number" className="input" value={prodForm.width} onChange={e => setProdForm({...prodForm, width: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Boy (cm) *</label><input type="number" className="input" value={prodForm.height} onChange={e => setProdForm({...prodForm, height: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Mekanizma</label><select className="input" value={prodForm.mechanism} onChange={e => setProdForm({...prodForm, mechanism: e.target.value})}><option>Manuel</option><option>Otomatik</option><option>Zincir</option></select></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Parça</label><input type="number" className="input" value={prodForm.parts} onChange={e => setProdForm({...prodForm, parts: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Şehir</label><input className="input" value={prodForm.customerCity} onChange={e => setProdForm({...prodForm, customerCity: e.target.value})} /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Teslim Tarihi</label><input type="date" className="input" value={prodForm.deliveryDate} onChange={e => setProdForm({...prodForm, deliveryDate: e.target.value})} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Not</label><textarea className="input" rows={2} value={prodForm.notes} onChange={e => setProdForm({...prodForm, notes: e.target.value})} /></div>
            </div>
            {convertMsg && <div className="badge" style={{ marginTop: '0.75rem', background: convertMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: convertMsg.ok ? '#10b981' : '#ef4444', border: 'none', padding: '0.5rem 0.75rem' }}>{convertMsg.text}</div>}
            <button className="button" onClick={handleConvert} disabled={converting || !prodForm.fabricCode || !prodForm.width || !prodForm.height} style={{ width: '100%', marginTop: '1rem' }}>
              {converting ? 'Kaydediliyor...' : '✓ Üretime Al'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .mp-spinner {
          width: 16px; height: 16px;
          border: 2px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: mpSpin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes mpSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
