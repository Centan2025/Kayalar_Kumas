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

const ROLE_LABELS: Record<string, string> = {
    'ADMIN': 'Yönetici',
    'CUTTER': 'Kesimhane',
    'TAILOR': 'Dikimhane',
    'QC': 'Kalite Kontrol',
    'PACKAGER': 'Paketleme',
    'LOGISTICS': 'Sevkiyat'
};

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {profile?.avatar_url ? (
                        <img 
                            src={profile.avatar_url} 
                            alt={userName} 
                            style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                        />
                    ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(30,64,175,0.2)' }}>🏠</div>
                    )}
                    <div>
                        <h1 style={{ fontSize: '1.1rem', margin: 0 }}>Kayalar Kumaş</h1>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Hoş geldin, {userName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4" style={{ justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
                    <div className="flex items-center gap-2 no-print" style={{ backgroundColor: 'var(--bg-color)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.7rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            {roles.map(r => ROLE_LABELS[r] || r).join(', ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <OfflineSyncBadge />
                        <button onClick={handleLogout} className="button button-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px' }}>
                            <LogOut size={16} />
                        </button>
                    </div>
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
