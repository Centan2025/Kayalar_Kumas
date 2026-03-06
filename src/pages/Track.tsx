import { useParams } from 'react-router-dom';

type OrderStatus = 'PENDING' | 'CUTTING' | 'SEWING' | 'QC' | 'READY' | 'IN_TRANSIT' | 'DELIVERED';

const STEPS: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'PENDING', label: 'Sipariş Alındı', icon: '📋' },
    { key: 'CUTTING', label: 'Kumaş Kesildi', icon: '✂️' },
    { key: 'SEWING', label: 'Dikiliyor', icon: '🧵' },
    { key: 'QC', label: 'Kalite Kontrol', icon: '🔍' },
    { key: 'READY', label: 'Paketlendi', icon: '📦' },
    { key: 'IN_TRANSIT', label: 'Yolda', icon: '🚚' },
    { key: 'DELIVERED', label: 'Teslim Edildi', icon: '✅' },
];

const FABRIC_CARE: Record<string, { name: string; care: string[] }> = {
    'K-900': { name: 'Fon Perde Kumaşı (K-900)', care: ['30°C\'de hassas yıkama', 'Düşük ısıda ütüleme', 'Çamaşır suyu kullanmayın', 'Gölgede kurutun', 'Kuru temizleme uygundur'] },
    'T-120': { name: 'Tül Perde (T-120)', care: ['Elde yıkama önerilir', 'Ütülemeyin — asmak yeterlidir', 'Çamaşır suyu kullanmayın', 'Kurutma makinesi kullanmayın'] },
    'S-200': { name: 'Store Perde (S-200)', care: ['Nemli bez ile silin', 'Mekanizmayı yılda 1 kez yağlayın', 'Suya maruz bırakmayın'] },
};

const MOCK_TRACK: Record<string, { status: OrderStatus; customerName: string; fabricCode: string; deliveryDate: string; notes: string; mechanism: string; width: number; height: number; warrantyMonths: number }> = {
    'ORD-1029': { status: 'SEWING', customerName: 'Ayşe Y.', fabricCode: 'K-900', deliveryDate: '2026-03-10', notes: 'Motorlu fon perde', mechanism: 'Motorlu', width: 320, height: 260, warrantyMonths: 24 },
    'ORD-1050': { status: 'QC', customerName: 'Mehmet D.', fabricCode: 'T-120', deliveryDate: '2026-03-12', notes: 'Tül perde', mechanism: 'Manuel', width: 200, height: 240, warrantyMonths: 12 },
    'ORD-1051': { status: 'PENDING', customerName: 'Fatma K.', fabricCode: 'K-900', deliveryDate: '2026-03-15', notes: 'Salon fon + tül', mechanism: 'Raylı', width: 400, height: 300, warrantyMonths: 24 },
    'ORD-1052': { status: 'DELIVERED', customerName: 'Ali Ö.', fabricCode: 'S-200', deliveryDate: '2026-03-01', notes: 'Store perde', mechanism: 'Motorlu', width: 180, height: 220, warrantyMonths: 24 },
};

export default function Track() {
    const { orderId } = useParams<{ orderId: string }>();
    const order = orderId ? MOCK_TRACK[orderId] : null;

    if (!order) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</p>
                    <h2>Sipariş Bulunamadı</h2>
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Lütfen geçerli bir sipariş kodu ile tekrar deneyin.</p>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '1rem' }}>Aranan: {orderId || '—'}</p>
                </div>
            </div>
        );
    }

    const currentIdx = STEPS.findIndex(s => s.key === order.status);
    const fabricCare = FABRIC_CARE[order.fabricCode];

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', fontFamily: 'Inter, sans-serif', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', fontSize: '1.5rem' }}>🧵</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Sipariş Takibi</h1>
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>{orderId}</p>
                </div>

                {/* Info Card */}
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                        <div><span style={{ color: '#94a3b8' }}>Müşteri</span><br /><strong>{order.customerName}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Kumaş</span><br /><strong>{order.fabricCode}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Ölçü</span><br /><strong>{order.width}×{order.height} cm</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Mekanizma</span><br /><strong>{order.mechanism}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Tahmini Teslim</span><br /><strong>{order.deliveryDate}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Detay</span><br /><strong>{order.notes}</strong></div>
                    </div>
                </div>

                {/* Step Progress */}
                <div style={{ position: 'relative' }}>
                    {STEPS.map((step, idx) => {
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        const isFuture = idx > currentIdx;

                        return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative' }}>
                                {idx < STEPS.length - 1 && (
                                    <div style={{
                                        position: 'absolute', left: '19px', top: '40px', width: '2px', height: 'calc(100% - 10px)',
                                        backgroundColor: isDone ? '#4f46e5' : 'rgba(255,255,255,0.1)'
                                    }} />
                                )}
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
                                    backgroundColor: isCurrent ? '#4f46e5' : isDone ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.05)',
                                    border: isCurrent ? '3px solid #7c3aed' : 'none',
                                    boxShadow: isCurrent ? '0 0 20px rgba(79,70,229,0.4)' : 'none',
                                    transition: 'all 0.3s ease',
                                }}>
                                    {step.icon}
                                </div>
                                <div style={{ paddingBottom: '2rem' }}>
                                    <span style={{
                                        fontWeight: isCurrent ? 700 : 400,
                                        color: isFuture ? '#475569' : isCurrent ? 'white' : '#94a3b8',
                                        fontSize: isCurrent ? '1rem' : '0.875rem',
                                    }}>
                                        {step.label}
                                    </span>
                                    {isCurrent && (
                                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.25rem', animation: 'pulse 2s infinite' }}>
                                            ● Şu anda bu aşamada
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

                {/* Delivered: Care & Warranty */}
                {order.status === 'DELIVERED' && (
                    <>
                        <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>🎉 Teslim Edildi</h3>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Ürününüz başarıyla teslim edilmiştir.</p>
                        </div>

                        {/* Garanti Bilgisi */}
                        <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <h3 style={{ color: '#818cf8', marginBottom: '0.75rem' }}>🛡️ Garanti Belgesi</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <div><span style={{ color: '#94a3b8' }}>Garanti Süresi:</span><br /><strong>{order.warrantyMonths} Ay</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Bitiş Tarihi:</span><br /><strong>{(() => { const d = new Date(order.deliveryDate); d.setMonth(d.getMonth() + order.warrantyMonths); return d.toLocaleDateString('tr-TR'); })()}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Mekanizma:</span><br /><strong>{order.mechanism}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Sipariş No:</span><br /><strong>{orderId}</strong></div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.75rem' }}>Bu QR kodu garanti belgesi yerine geçer. Lütfen saklayın.</p>
                        </div>

                        {/* Bakım Talimatları */}
                        {fabricCare && (
                            <div style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <h3 style={{ color: '#f59e0b', marginBottom: '0.75rem' }}>🧹 Bakım Talimatları</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>{fabricCare.name}</p>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {fabricCare.care.map((item, i) => (
                                        <li key={i} style={{ fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: i < fabricCare.care.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: '#f59e0b' }}>•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', marginTop: '3rem' }}>
                    Bu sayfa otomatik güncellenir. Son kontrol: {new Date().toLocaleString('tr-TR')}
                </p>
            </div>
        </div>
    );
}
