import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, TrendingUp, Users, Package, BarChart3, Activity, Calendar } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';

// ---------- MOCK DATA ----------
const DAILY_STATS = [
    { label: 'Bugün Tamamlanan', value: 12, icon: <Package size={20} />, color: '#10b981' },
    { label: 'Aktif Siparişler', value: 23, icon: <Activity size={20} />, color: '#3b82f6' },
    { label: 'Revizyon Oranı', value: '%4.2', icon: <TrendingUp size={20} />, color: '#f59e0b' },
    { label: 'Aktif Personel', value: 8, icon: <Users size={20} />, color: '#8b5cf6' },
];

const STATION_STATS = [
    { name: 'Kesimhane', avgMinutes: 28, activeOrders: 3, color: '#8b5cf6' },
    { name: 'Dikim', avgMinutes: 85, activeOrders: 7, color: '#f59e0b' },
    { name: 'Kalite Kontrol', avgMinutes: 15, activeOrders: 2, color: '#3b82f6' },
    { name: 'Paketleme', avgMinutes: 12, activeOrders: 1, color: '#10b981' },
];

const CRITICAL_STOCKS = [
    { code: 'T-120', type: 'Kumaş (Tül)', current: 8.2, critical: 15 },
    { code: 'H-050', type: 'Aksesuar (Halka)', current: 18, critical: 20 },
];

// Günlük sipariş verisi (son 7 gün)
const DAILY_ORDERS = [
    { day: 'Pzt', count: 8 },
    { day: 'Sal', count: 14 },
    { day: 'Çar', count: 11 },
    { day: 'Per', count: 18 },
    { day: 'Cum', count: 22 },
    { day: 'Cmt', count: 6 },
    { day: 'Paz', count: 3 },
];

// Aylık sipariş verisi (son 12 ay)
const MONTHLY_ORDERS = [
    { month: 'Nis', count: 42 }, { month: 'May', count: 58 }, { month: 'Haz', count: 65 },
    { month: 'Tem', count: 48 }, { month: 'Ağu', count: 38 }, { month: 'Eyl', count: 72 },
    { month: 'Eki', count: 80 }, { month: 'Kas', count: 95 }, { month: 'Ara', count: 110 },
    { month: 'Oca', count: 78 }, { month: 'Şub', count: 88 }, { month: 'Mar', count: 62 },
];

// Yıllık gelir verisi
const YEARLY_REVENUE = [
    { year: '2022', revenue: 850 },
    { year: '2023', revenue: 1240 },
    { year: '2024', revenue: 1680 },
    { year: '2025', revenue: 2150 },
    { year: '2026', revenue: 980 },
];

type ChartTab = 'daily' | 'monthly' | 'yearly';

function BarChart({ data, labelKey, valueKey, color, unit, maxVal }: {
    data: Record<string, any>[];
    labelKey: string; valueKey: string; color: string; unit: string; maxVal?: number;
}) {
    const max = maxVal || Math.max(...data.map(d => d[valueKey]));
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.35rem', height: '180px', padding: '0.5rem 0' }}>
            {data.map((item, i) => {
                const pct = (item[valueKey] / max) * 100;
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>
                            {item[valueKey]}{unit}
                        </span>
                        <div style={{
                            width: '100%', maxWidth: '42px', borderRadius: '6px 6px 0 0',
                            height: `${Math.max(pct, 4)}%`,
                            background: `linear-gradient(180deg, ${color}, ${color}88)`,
                            transition: 'height 0.5s ease',
                            minHeight: '4px',
                        }} />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                            {item[labelKey]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default function Reports() {
    const navigate = useNavigate();
    const [chartTab, setChartTab] = useState<ChartTab>('daily');
    const maxAvg = Math.max(...STATION_STATS.map(s => s.avgMinutes));

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏠</div>
                    <div>
                        <h2 style={{ margin: 0 }}>Kayalar Kumaş — Rapor Paneli</h2>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem' }}>Ev ve Otel Tekstili • Anlık üretim performansı</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                    {DAILY_STATS.map(stat => (
                        <div key={stat.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {stat.icon}
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>{stat.label}</p>
                                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{stat.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ========== CHART TABS: GÜNLÜK / AYLIK / YILLIK ========== */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <div className="flex items-center gap-2">
                            <Calendar size={20} color="var(--primary)" />
                            <h3 style={{ margin: 0 }}>Sipariş / Gelir Analizi</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                            {([
                                { key: 'daily', label: 'Günlük' },
                                { key: 'monthly', label: 'Aylık' },
                                { key: 'yearly', label: 'Yıllık' },
                            ] as { key: ChartTab; label: string }[]).map(t => (
                                <button key={t.key} onClick={() => setChartTab(t.key)} style={{
                                    padding: '0.4rem 0.75rem', border: 'none', borderRadius: 'var(--radius-md)',
                                    backgroundColor: chartTab === t.key ? 'var(--card-bg)' : 'transparent',
                                    color: chartTab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: chartTab === t.key ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer',
                                    boxShadow: chartTab === t.key ? 'var(--shadow-sm)' : 'none',
                                }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {chartTab === 'daily' && (
                        <div className="animate-fade-in">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Son 7 Gün — Tamamlanan Sipariş Sayısı</p>
                            <BarChart data={DAILY_ORDERS} labelKey="day" valueKey="count" color="#3b82f6" unit="" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Haftalık Toplam: <strong>{DAILY_ORDERS.reduce((s, d) => s + d.count, 0)}</strong></span>
                                <span>Günlük Ort.: <strong>{Math.round(DAILY_ORDERS.reduce((s, d) => s + d.count, 0) / 7)}</strong></span>
                                <span>En Yoğun: <strong>{DAILY_ORDERS.reduce((a, b) => a.count > b.count ? a : b).day}</strong></span>
                            </div>
                        </div>
                    )}

                    {chartTab === 'monthly' && (
                        <div className="animate-fade-in">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Son 12 Ay — Aylık Sipariş Adedi</p>
                            <BarChart data={MONTHLY_ORDERS} labelKey="month" valueKey="count" color="#8b5cf6" unit="" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Yıllık Toplam: <strong>{MONTHLY_ORDERS.reduce((s, d) => s + d.count, 0)}</strong></span>
                                <span>Aylık Ort.: <strong>{Math.round(MONTHLY_ORDERS.reduce((s, d) => s + d.count, 0) / 12)}</strong></span>
                                <span>Zirve: <strong>{MONTHLY_ORDERS.reduce((a, b) => a.count > b.count ? a : b).month}</strong></span>
                            </div>
                        </div>
                    )}

                    {chartTab === 'yearly' && (
                        <div className="animate-fade-in">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Yıllık Ciro (×1.000 ₺)</p>
                            <BarChart data={YEARLY_REVENUE} labelKey="year" valueKey="revenue" color="#10b981" unit="K" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Toplam: <strong>{YEARLY_REVENUE.reduce((s, d) => s + d.revenue, 0).toLocaleString('tr-TR')}K ₺</strong></span>
                                <span>Büyüme (23→25): <strong>%{Math.round(((2150 - 1240) / 1240) * 100)}</strong></span>
                                <span>2026 (devam): <strong>980K ₺</strong></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Station Performance */}
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
                        <BarChart3 size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0 }}>İstasyon Bazlı Performans</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                        {STATION_STATS.map(station => (
                            <div key={station.name}>
                                <div className="flex justify-between" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontWeight: 500 }}>{station.name}</span>
                                        <span className="badge" style={{ backgroundColor: `${station.color}15`, color: station.color, border: `1px solid ${station.color}30`, fontSize: '0.7rem' }}>
                                            {station.activeOrders} aktif iş
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                        <Clock size={14} />
                                        <span>Ort. {station.avgMinutes} dk</span>
                                    </div>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'var(--bg-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${(station.avgMinutes / maxAvg) * 100}%`,
                                        backgroundColor: station.color, borderRadius: '4px', transition: 'width 0.5s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '8px', fontSize: '0.875rem' }}>
                        <strong>⚠️ Darboğaz Uyarısı:</strong> Dikim istasyonu ortalama 85dk ile en yavaş. 7 aktif iş bekliyor. Ek personel veya vardiya düzenlemesi önerilir.
                    </div>
                </div>

                {/* Critical Stocks */}
                <div className="card">
                    <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
                        <AlertTriangle size={20} color="var(--danger)" />
                        <h3 style={{ margin: 0 }}>Kritik Stok Uyarıları</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {CRITICAL_STOCKS.map(stock => (
                            <div key={stock.code} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1rem', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '8px',
                                border: '1px solid rgba(239,68,68,0.15)'
                            }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{stock.code}</span>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{stock.type}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{stock.current}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}> / {stock.critical} (min)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
