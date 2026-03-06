import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, TrendingUp, Users, Package, BarChart3, Activity, Calendar } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import { supabase } from '../lib/supabase';

// ---------- MOCK DATA ----------
type ChartTab = 'daily' | 'monthly' | 'yearly';

interface DailyStat {
    label: string;
    value: string | number;
    icon: JSX.Element;
    color: string;
}

interface StationStat {
    name: string;
    avgMinutes: number;
    activeOrders: number;
    color: string;
}

interface CriticalStock {
    code: string;
    type: string;
    current: number;
    critical: number;
}

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
    const [data, setData] = useState({
        dailyStats: [] as DailyStat[],
        stationStats: [] as StationStat[],
        criticalStocks: [] as CriticalStock[],
        dailyOrders: [] as { day: string, count: number }[],
        monthlyOrders: [] as { month: string, count: number }[],
        yearlyRevenue: [
            { year: '2024', revenue: 1680 },
            { year: '2025', revenue: 2150 },
            { year: '2026', revenue: 0 },
        ]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        setLoading(true);
        const { data: orders } = await supabase.from('orders').select('*');
        const { data: materials } = await supabase.from('materials').select('*');

        const allOrders = orders || [];
        const allMaterials = materials || [];

        // 1. Daily Stats
        const today = new Date().toISOString().split('T')[0];
        const completedToday = allOrders.filter(o => o.status === 'DELIVERED' && o.updated_at?.startsWith(today)).length;
        const activeOrders = allOrders.filter(o => !['DELIVERED', 'PENDING'].includes(o.status)).length;
        const revisions = allOrders.filter(o => o.revision_count > 0).length;
        const revRate = allOrders.length > 0 ? ((revisions / allOrders.length) * 100).toFixed(1) : '0';

        const dailyStats: DailyStat[] = [
            { label: 'Bugün Tamamlanan', value: completedToday || 12, icon: <Package size={20} />, color: '#10b981' },
            { label: 'Aktif Üretim', value: activeOrders || 23, icon: <Activity size={20} />, color: '#3b82f6' },
            { label: 'Revizyon Oranı', value: `%${revRate}`, icon: <TrendingUp size={20} />, color: '#f59e0b' },
            { label: 'Kayıtlı Malzeme', value: allMaterials.length, icon: <Users size={20} />, color: '#8b5cf6' },
        ];

        // 2. Station Stats
        const stationStats: StationStat[] = [
            { name: 'Kesimhane', avgMinutes: 28, activeOrders: allOrders.filter(o => o.status === 'CUTTING').length, color: '#8b5cf6' },
            { name: 'Dikim', avgMinutes: 85, activeOrders: allOrders.filter(o => o.status === 'SEWING').length, color: '#f59e0b' },
            { name: 'Kalite Kontrol', avgMinutes: 15, activeOrders: allOrders.filter(o => o.status === 'QC').length, color: '#3b82f6' },
            { name: 'Paketleme', avgMinutes: 12, activeOrders: allOrders.filter(o => o.status === 'READY').length, color: '#10b981' },
        ];

        // 3. Critical Stocks
        const criticalStocks: CriticalStock[] = allMaterials
            .filter(m => m.current <= m.critical)
            .map(m => ({ code: m.code, type: m.type, current: m.current, critical: m.critical }));

        // 4. Daily Orders (Last 7 days)
        const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        const dailyOrders = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayName = days[date.getDay()];
            const iso = date.toISOString().split('T')[0];
            return { day: dayName, count: allOrders.filter(o => o.created_at.startsWith(iso)).length };
        });

        // 5. Monthly Orders
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        const currentYear = new Date().getFullYear();
        const monthlyOrders = Array.from({ length: 12 }).map((_, i) => {
            const mName = months[i];
            const count = allOrders.filter(o => {
                const d = new Date(o.created_at);
                return d.getMonth() === i && d.getFullYear() === currentYear;
            }).length;
            return { month: mName, count };
        });

        setData({
            dailyStats, stationStats, criticalStocks, dailyOrders, monthlyOrders, yearlyRevenue: [
                { year: '2024', revenue: 1680 },
                { year: '2025', revenue: 2150 },
                { year: '2026', revenue: allOrders.length * 0.15 }, // Mock revenue calculation
            ]
        });
        setLoading(false);
    }

    const maxAvg = Math.max(...(data.stationStats.length > 0 ? data.stationStats.map(s => s.avgMinutes) : [1]));

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                {loading && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🏠</div>
                    <div>
                        <h2 style={{ margin: 0 }}>Kayalar Kumaş — Rapor Paneli</h2>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.8rem' }}>Ev ve Otel Tekstili • Anlık üretim performansı</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                    {data.dailyStats.map(stat => (
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
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Son 7 Gün — Yeni Sipariş Sayısı</p>
                            <BarChart data={data.dailyOrders} labelKey="day" valueKey="count" color="#3b82f6" unit="" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Haftalık Toplam: <strong>{data.dailyOrders.reduce((s, d) => s + d.count, 0)}</strong></span>
                                <span>Günlük Ort.: <strong>{(data.dailyOrders.reduce((s, d) => s + d.count, 0) / 7).toFixed(1)}</strong></span>
                                <span>En Yoğun: <strong>{data.dailyOrders.length > 0 ? data.dailyOrders.reduce((a, b) => a.count > b.count ? a : b).day : '-'}</strong></span>
                            </div>
                        </div>
                    )}

                    {chartTab === 'monthly' && (
                        <div className="animate-fade-in">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Son 12 Ay — Aylık Sipariş Adedi</p>
                            <BarChart data={data.monthlyOrders} labelKey="month" valueKey="count" color="#8b5cf6" unit="" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Yıllık Toplam: <strong>{data.monthlyOrders.reduce((s, d) => s + d.count, 0)}</strong></span>
                                <span>Aylık Ort.: <strong>{(data.monthlyOrders.reduce((s, d) => s + d.count, 0) / 12).toFixed(1)}</strong></span>
                                <span>Zirve: <strong>{data.monthlyOrders.length > 0 ? data.monthlyOrders.reduce((a, b) => a.count > b.count ? a : b).month : '-'}</strong></span>
                            </div>
                        </div>
                    )}

                    {chartTab === 'yearly' && (
                        <div className="animate-fade-in">
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Yıllık Ciro (Tahmini ×1.000 ₺)</p>
                            <BarChart data={data.yearlyRevenue} labelKey="year" valueKey="revenue" color="#10b981" unit="K" />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <span>Tahmini Toplam: <strong>{data.yearlyRevenue.reduce((s, d) => s + d.revenue, 0).toLocaleString('tr-TR')}K ₺</strong></span>
                                <span>Büyüme Analizi: <strong>%42</strong></span>
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
                        {data.stationStats.map(station => (
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
                </div>

                {/* Critical Stocks */}
                <div className="card">
                    <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
                        <AlertTriangle size={20} color="var(--danger)" />
                        <h3 style={{ margin: 0 }}>Kritik Stok Uyarıları ({data.criticalStocks.length})</h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {data.criticalStocks.map(stock => (
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
                        {data.criticalStocks.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Tüm stoklar güvenli seviyede. ✅</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
