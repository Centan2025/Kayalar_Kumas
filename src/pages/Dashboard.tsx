import { useNavigate } from 'react-router-dom';
import { Camera, ClipboardCheck, LogOut, Scissors, ArrowRight, Package, Truck, BarChart3, ShoppingCart, Users as UsersIcon } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';

const CARDS = [
    { title: 'Sipariş Yönetimi', desc: 'Yeni sipariş oluştur, mevcut siparişleri takip et.', icon: <ShoppingCart size={24} />, path: '/orders', color: '#ec4899', bgColor: 'rgba(236,72,153,0.1)', requiredRole: 'ADMIN' },
    { title: 'Kesim İstasyonu', desc: 'Ham kumaştan metraj düş ve sipariş QR\'ı ile eşleştir.', icon: <Scissors size={24} />, path: '/scan?station=cut', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)', requiredRole: 'CUTTER' },
    { title: 'Dikim İstasyonu', desc: 'Kesimden gelen kumaşın QR\'ını okut, dikim işlemini tamamla.', icon: <Camera size={24} />, path: '/scan?station=sew', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)', requiredRole: 'TAILOR' },
    { title: 'Kalite Kontrol', desc: 'Ürünü denetle, fotoğraf çek ve paketlemeye gönder.', icon: <ClipboardCheck size={24} />, path: '/station/qc', color: '#10b981', bgColor: 'rgba(16,185,129,0.1)', requiredRole: 'QC' },
    { title: 'Paketleme & Sevkiyat', desc: 'Koli parçalarını okut, eksik parça varsa sevk etme.', icon: <Truck size={24} />, path: '/packaging', color: '#f97316', bgColor: 'rgba(249,115,22,0.1)', requiredRole: 'PACKAGER' },
    { title: 'Depo & Stok', desc: 'Ham madde, kumaş toplarını yönet ve envanter durumunu görüntüle.', icon: <Package size={24} />, path: '/warehouse', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)', requiredRole: 'ADMIN' },
    { title: 'Rapor Paneli', desc: 'İstasyon performansı, darboğaz analizi ve kritik stok uyarıları.', icon: <BarChart3 size={24} />, path: '/reports', color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)', requiredRole: 'ADMIN' },
];

import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const navigate = useNavigate();
    const { profile, signOut } = useAuth();
    const roles = profile?.roles || [];
    const isAdmin = roles.includes('ADMIN');
    const userName = profile?.full_name || 'Personel';

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const ALL_CARDS = [
        ...CARDS.filter(card => isAdmin || roles.includes(card.requiredRole)),
        ...(isAdmin ? [{
            title: 'Kullanıcı & Yetki Yönetimi',
            desc: 'Personel ekle, rollerini ve sistem yetkilerini düzenle.',
            icon: <UsersIcon size={24} />,
            path: '/users',
            color: 'var(--primary)',
            bgColor: 'rgba(79,70,229,0.1)',
            isAdmin: true
        }] : [])
    ];

    return (
        <div>
            <header className="app-header">
                <div>
                    <h1 style={{ fontSize: '1.1rem', margin: 0 }}>🏠 Kayalar Kumaş</h1>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ev ve Otel Tekstili — {userName} ({roles.join(', ')})</span>
                </div>
                <div className="flex items-center gap-4">
                    <OfflineSyncBadge />
                    <button onClick={handleLogout} className="button button-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>İstasyonlar ve Modüller</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {ALL_CARDS.map(card => (
                        <div
                            key={card.title}
                            className="card flex flex-col justify-between"
                            style={{
                                cursor: 'pointer',
                                border: (card as any).isAdmin ? '1px solid var(--primary)' : '1px solid transparent'
                            }}
                            onClick={() => navigate(card.path)}
                        >
                            <div>
                                <div style={{ backgroundColor: card.bgColor, color: card.color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    {card.icon}
                                </div>
                                <h3>{card.title}</h3>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>{card.desc}</p>
                            </div>
                            <div className="flex items-center justify-between" style={{ marginTop: '1.5rem', color: card.color, fontWeight: 500 }}>
                                <span>{(card as any).isAdmin ? 'Yönetim Paneli' : 'Geçiş Yap'}</span>
                                <ArrowRight size={18} />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
