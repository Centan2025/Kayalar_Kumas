import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Shield, User, Trash2, Key, QrCode, Printer, Check, X, Edit2, Save, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { STATUS_LABELS, OrderStatus } from './Orders';

const AVAILABLE_ROLES = [
    { id: 'ADMIN', label: 'Sistem Yöneticisi' },
    { id: 'CUTTER', label: 'Kesimhane' },
    { id: 'TAILOR', label: 'Dikim Atölyesi' },
    { id: 'QC', label: 'Kalite Kontrol' },
    { id: 'PACKAGER', label: 'Paketleme' },
    { id: 'LOGISTICS', label: 'Sevkiyat / Lojistik' },
];

export default function Users() {
    const navigate = useNavigate();
    const { profile: currentUserProfile } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [selectedUserQr, setSelectedUserQr] = useState<any>(null);
    const [formState, setFormState] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        roles: [] as string[]
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (error) {
            console.error('Fetch error:', error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }

    const toggleRole = (roleId: string) => {
        setFormState(prev => ({
            ...prev,
            roles: prev.roles.includes(roleId)
                ? prev.roles.filter(r => r !== roleId)
                : [...prev.roles, roleId]
        }));
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setFormState({
            id: user.id,
            name: user.full_name || '',
            email: '',
            password: '',
            roles: Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : [])
        });
        setShowForm(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formState.roles.length === 0) {
            alert('Lütfen en az bir yetki seçin.');
            return;
        }

        setLoading(true);
        try {
            if (editingUser) {
                // UPDATE mevcut profil
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formState.name,
                        roles: formState.roles,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', formState.id);

                if (error) throw error;
                alert('Kullanıcı başarıyla güncellendi.');
            } else {
                // YENİ PERSONEL (Veri Tabanı Odaklı - Auth Bağımsız)
                if (!formState.name) {
                    alert('Lütfen personelin adını ve soyadını girin.');
                    setLoading(false);
                    return;
                }

                // Rastgele bir ID oluştur (Auth bağımsız)
                const newId = crypto.randomUUID();
                const qrToken = `qr_auth_${newId}_${Math.random().toString(36).substr(2, 9)}`;

                console.log('Creating data-driven profile for:', newId);
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: newId,
                        full_name: formState.name,
                        roles: formState.roles,
                        qr_token: qrToken,
                        updated_at: new Date().toISOString()
                    });

                if (profileError) {
                    console.error('Profile Error:', profileError);
                    if (profileError.message.includes('qr_token')) {
                        throw new Error("Veritabanı Yapılandırma Hatası: 'qr_token' sütunu eksik. Lütfen SQL kodunu çalıştırın.");
                    }
                    throw profileError;
                }
                alert('Yeni personel başarıyla eklendi. QR kartını oluşturarak giriş yapmasını sağlayabilirsiniz.');
            }
            setShowForm(false);
            setEditingUser(null);
            setFormState({ id: '', name: '', email: '', password: '', roles: [] });
            fetchUsers();
        } catch (err: any) {
            console.error('Form Submit Error:', err);
            alert('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const generateQrToken = async (userId: string) => {
        const token = `qr_auth_${userId}_${Math.random().toString(36).substr(2, 9)}`;
        const { error } = await supabase
            .from('profiles')
            .update({ qr_token: token })
            .eq('id', userId);

        if (error) alert(error.message);
        else fetchUsers();
    };

    const deleteUser = async (id: string) => {
        if (window.confirm('Bu kullanıcıyı sistemden kaldırmak istediğinize emin misiniz?')) {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) alert(error.message);
            else fetchUsers();
        }
    };

    const printQr = () => { window.print(); };

    if (currentUserProfile?.roles && !currentUserProfile.roles.includes('ADMIN')) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '5rem' }}>Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header no-print">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                <div className="flex justify-between items-center no-print" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={24} color="var(--primary)" /> Kullanıcı & Yetki Yönetimi
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Personel yetkilerini düzenleyin ve QR giriş kartlarını yönetin.</p>
                    </div>
                    <button onClick={() => { setShowForm(!showForm); setEditingUser(null); setFormState({ id: '', name: '', email: '', password: '', roles: [] }); }} className="button">
                        {showForm ? <X size={20} /> : <UserPlus size={20} />}
                        {showForm ? 'Kapat' : 'Yeni Personel Yetkilendir'}
                    </button>
                </div>

                {showForm && (
                    <div className="card animate-fade-in no-print" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{editingUser ? 'Personel Yetkilerini Düzenle' : 'Yeni Yetki Tanımla'}</h3>
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="label">Ad Soyad</label>
                                        <input type="text" className="input" required value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} placeholder="Örn: Veli Dikim" />
                                    </div>
                                    {!editingUser && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                            💡 Yeni personel artık sadece bir isimle eklenebilir. Giriş yapması için kendisine özel bir <strong>QR Kart</strong> tanımlanacaktır.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="label" style={{ marginBottom: '1rem' }}>Sistem Yetki Alanları</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                        {AVAILABLE_ROLES.map(role => (
                                            <div
                                                key={role.id}
                                                onClick={() => toggleRole(role.id)}
                                                style={{
                                                    padding: '0.75rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid',
                                                    borderColor: formState.roles.includes(role.id) ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                                    backgroundColor: formState.roles.includes(role.id) ? 'rgba(79,70,229,0.1)' : 'transparent',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {formState.roles.includes(role.id) && <Check size={14} color="var(--primary)" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '0.875rem' }}>{role.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowForm(false)} className="button button-outline" style={{ flex: 1 }}>İptal</button>
                                <button type="submit" className="button" style={{ flex: 2 }} disabled={loading}>
                                    {loading ? <X size={18} className="animate-spin" /> : (editingUser ? <Save size={18} /> : <UserPlus size={18} />)}
                                    {editingUser ? 'Değişiklikleri Kaydet' : 'Yetkilendirmeyi Tamamla'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="flex flex-col gap-3 no-print">
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem' }}>Aktif Personel Listesi ({users.length})</h3>
                        <button onClick={fetchUsers} className="button button-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Yenile</button>
                    </div>

                    {loading && !users.length ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Yükleniyor...</p>
                    ) : users.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <UserPlus size={32} color="var(--text-muted)" />
                            </div>
                            <h3 style={{ margin: 0 }}>Henüz personel eklenmemiş</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '300px' }}>
                                Sisteme giriş yapacak ve istasyonlarda işlem yapacak personelleri buradan ekleyebilirsiniz.
                            </p>
                            <button onClick={() => setShowForm(true)} className="button" style={{ marginTop: '1rem' }}>
                                <Plus size={20} /> İlk Personeli Ekle
                            </button>
                        </div>
                    ) : (
                        users.map(user => (
                            <div key={user.id} className="card flex justify-between items-center" style={{ padding: '1rem 1.5rem' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={24} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{user.full_name}</h4>
                                        <div className="flex flex-wrap gap-2" style={{ marginTop: '0.5rem' }}>
                                            {(Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : [])).map((r: string) => (
                                                <span key={r} className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(79,70,229,0.1)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                    {STATUS_LABELS[r as OrderStatus]?.label || r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEditClick(user)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                                        title="Düzenle"
                                    >
                                        <Edit2 size={18} />
                                    </button>

                                    {user.qr_token ? (
                                        <button
                                            onClick={() => setSelectedUserQr(user)}
                                            className="button button-outline"
                                            style={{ padding: '0.4rem 0.8rem', color: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.75rem' }}
                                        >
                                            <QrCode size={14} /> Kart
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => generateQrToken(user.id)}
                                            className="button button-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                        >
                                            <Key size={14} /> QR Tanımla
                                        </button>
                                    )}

                                    {user.full_name?.toLowerCase().indexOf('cenk') === -1 && (
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }}
                                            title="Sil"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* QR Printing Modal */}
                {selectedUserQr && (
                    <div className="qr-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="card" style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center', backgroundColor: 'white', color: 'black' }}>
                            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button onClick={() => setSelectedUserQr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'black' }}><X size={24} /></button>
                            </div>

                            <div id="printable-qr" style={{ padding: '1rem', border: '2px solid #000', borderRadius: '16px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', color: '#666' }}>KAYALAR KUMAŞ PERSONEL GİRİŞ KARTI</div>
                                <div style={{ width: '180px', height: '180px', margin: '0 auto 1.5rem auto', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px' }}>
                                    <QRCodeSVG
                                        value={selectedUserQr.qr_token}
                                        size={160}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <h2 style={{ color: 'black', marginBottom: '0.25rem' }}>{selectedUserQr.full_name}</h2>
                                <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: '1rem' }}>{selectedUserQr.roles?.join(' • ')}</p>
                                <div style={{ fontSize: '0.6rem', color: '#999' }}>Bu kart kişiye özeldir, paylaşılamaz.</div>
                            </div>

                            <div className="no-print" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setSelectedUserQr(null)} className="button button-outline" style={{ flex: 1, borderColor: '#ccc', color: '#666' }}>Kapat</button>
                                <button onClick={printQr} className="button" style={{ flex: 1, backgroundColor: 'black', color: 'white' }}>
                                    <Printer size={18} /> Yazdır
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    @media print {
                        @page {
                            margin: 0; /* Tarayıcı kenar boşluklarını sıfırla */
                            size: auto; /* Sayfa boyutunu içeriğe göre ayarla */
                        }
                        body { 
                            background: white !important; 
                            padding: 2cm !important; /* Yazdırma alanında güvenli boşluk bırak */
                            margin: 0 !important; 
                            display: flex !important;
                            justify-content: center !important;
                            align-items: flex-start !important; /* Üstten başla, kesilmeyi önle */
                        }
                        .no-print { display: none !important; }
                        .qr-modal-overlay { 
                            position: static !important; 
                            background: white !important; 
                            width: 100% !important;
                            display: block !important;
                            padding: 0 !important;
                        }
                        .card { 
                            box-shadow: none !important; 
                            border: none !important; 
                            margin: 0 auto !important; /* Tam ortaya hizala */
                            padding: 0 !important;
                        }
                        #printable-qr {
                            width: 300px !important; /* Yazıcıda ideal boyut (yaklaşık 8cm) */
                            margin: 0 auto !important;
                            page-break-inside: avoid !important; /* Kartın bölünmesini engelle */
                        }
                    }
                `}</style>
            </main>
        </div>
    );
}
