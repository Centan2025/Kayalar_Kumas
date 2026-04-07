import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Shield, User, Trash2, Key, QrCode, Printer, Check, X, Edit2, Save, LayoutGrid, List, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import BackButton from '../components/BackButton';
import ImageUploader from '../components/ImageUploader';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';


const AVAILABLE_ROLES = [
    { id: 'ADMIN', label: 'Sistem Yöneticisi' },
    { id: 'CUTTER', label: 'Kesimhane' },
    { id: 'TAILOR', label: 'Dikim Atölyesi' },
    { id: 'QC', label: 'Kalite Kontrol' },
    { id: 'PACKAGER', label: 'Paketleme' },
    { id: 'LOGISTICS', label: 'Sevkiyat / Lojistik' },
];

const ROLE_MAP: Record<string, string> = {
    'ADMIN': 'Sistem Yöneticisi',
    'CUTTER': 'Kesimhane - Kesim',
    'TAILOR': 'Dikimhane - Terzi',
    'QC': 'Kalite Kontrol',
    'PACKAGER': 'Paketleme / Etiket',
    'LOGISTICS': 'Sevkiyat / Lojistik',
    'PENDING': 'Beklemede'
};

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
        roles: [] as string[],
        avatar_url: ''
    });
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

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
            roles: Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []),
            avatar_url: user.avatar_url || ''
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
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: formState.name,
                        roles: formState.roles,
                        avatar_url: formState.avatar_url,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', formState.id);

                if (error) throw error;
                alert('Kullanıcı başarıyla güncellendi.');
            } else {
                const qrToken = `qr_auth_${formState.id}_${Math.random().toString(36).substr(2, 9)}`;

                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: formState.id,
                        full_name: formState.name,
                        roles: formState.roles,
                        avatar_url: formState.avatar_url,
                        qr_token: qrToken,
                        updated_at: new Date().toISOString()
                    });

                if (profileError) throw profileError;
                alert('Yeni personel başarıyla eklendi.');
            }
            setShowForm(false);
            setEditingUser(null);
            setFormState({ id: '', name: '', roles: [], avatar_url: '' });
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

    const printQr = () => {
        if (!selectedUserQr) return;
        const win = window.open('', '_blank', 'width=400,height=600');
        if (!win) return;
        
        const rolesText = selectedUserQr.roles?.map((r: string) => ROLE_MAP[r] || r).join(' • ') || '';
        
        win.document.write(`
            <html><head><title>Personel Kartı — ${selectedUserQr.full_name}</title>
            <style>
                body { margin:0; padding:20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
                .card { 
                    border: 3px solid #000; 
                    padding: 40px; 
                    text-align: center; 
                    width: 340px; 
                    border-radius: 24px; 
                    background: white;
                    display: inline-block;
                    margin: 0 auto;
                }
                .header { font-size: 11px; font-weight: bold; color: #666; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px; }
                .qr-container { margin-bottom: 25px; display: flex; justify-content: center; }
                .qr-container svg { width: 220px !important; height: 220px !important; }
                .name { font-size: 28px; font-weight: bold; color: #000; margin: 0 0 8px 0; }
                .roles { font-size: 14px; color: #444; margin: 0 0 25px 0; font-weight: 500; }
                .footer { font-size: 10px; color: #999; border-top: 1px solid #eee; pt: 15px; }
                @media print { 
                    body { display: block; padding: 0; } 
                    .card { border: 4px solid #000; margin: 40px auto; display: block; } 
                }
            </style></head><body>
            <div class="card">
                <div class="header">KAYALAR KUMAŞ PERSONEL GİRİŞ KARTI</div>
                <div class="qr-container">${document.getElementById('printable-qr-svg')?.outerHTML || ''}</div>
                <h1 class="name">${selectedUserQr.full_name}</h1>
                <p class="roles">${rolesText}</p>
                <div class="footer">Bu kart kişiye özeldir, paylaşılamaz.</div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
            </body></html>
        `);
        win.document.close();
    };

    if (currentUserProfile?.roles && !currentUserProfile.roles.includes('ADMIN')) {
        return <div className="container" style={{ textAlign: 'center', marginTop: '5rem' }}>Bu sayfayı görüntüleme yetkiniz yok.</div>;
    }

    const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header no-print">
                <BackButton path="/dashboard" />
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                {loading && <LoadingScreen fullScreen message="Personeller yükleniyor..." />}
                <div className="flex justify-between items-center no-print" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={24} color="var(--primary)" /> Kullanıcı & Yetki Yönetimi
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Personel yetkilerini düzenleyin ve QR giriş kartlarını yönetin.</p>
                    </div>
                    <button 
                        onClick={() => { 
                            setShowForm(!showForm); 
                            setEditingUser(null); 
                            setFormState({ id: crypto.randomUUID(), name: '', roles: [], avatar_url: '' }); 
                        }} 
                        className="button"
                    >
                        {showForm ? <X size={20} /> : <UserPlus size={20} />}
                        {showForm ? 'Kapat' : 'Yeni Personel Yetkilendir'}
                    </button>
                </div>

                {showForm && (
                    <div className="card animate-fade-in no-print" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{editingUser ? 'Personel Yetkilerini Düzenle' : 'Yeni Yetki Tanımla'}</h3>
                        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
                            <div className="user-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '3rem', alignItems: 'start' }}>
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <label className="label">Ad Soyad</label>
                                        <input type="text" className="input" required value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} placeholder="Örn: Veli Dikim" />
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

                                <div className="flex flex-col gap-4">
                                    <label className="label">Profil Fotoğrafı</label>
                                    <ImageUploader 
                                        entityId={formState.id} 
                                        existingImages={formState.avatar_url ? [formState.avatar_url] : []}
                                        onImageSaved={(url) => setFormState(prev => ({ ...prev, avatar_url: url }))}
                                        onImageRemoved={() => setFormState(prev => ({ ...prev, avatar_url: '' }))}
                                        label="Fotoğraf Yükle"
                                        maxImages={1}
                                    />
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

                <div className="flex flex-col gap-4 no-print">
                    <div className="card flex items-center gap-4 flex-wrap" style={{ padding: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input"
                                placeholder="Personel Adı ile Ara..."
                                style={{ paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-bgColor" style={{ padding: '0.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            <button onClick={() => setViewMode('card')} style={{ padding: '0.5rem', border: 'none', backgroundColor: viewMode === 'card' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none' }}>
                                <LayoutGrid size={20} />
                            </button>
                            <button onClick={() => setViewMode('list')} style={{ padding: '0.5rem', border: 'none', backgroundColor: viewMode === 'list' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none' }}>
                                <List size={20} />
                            </button>
                        </div>
                    </div>

                    {loading && !users.length ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Yükleniyor...</p>
                    ) : filteredUsers.length === 0 ? (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <h3 style={{ color: 'var(--text-muted)' }}>Personel bulunamadı.</h3>
                        </div>
                    ) : viewMode === 'card' ? (
                        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {filteredUsers.map(user => (
                                <div key={user.id} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem 1.5rem', borderTop: '4px solid var(--primary)' }}>
                                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                        <div 
                                            style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '4px solid var(--bg-color)', boxShadow: 'var(--shadow-lg)', cursor: user.avatar_url ? 'zoom-in' : 'default' }}
                                            onClick={() => user.avatar_url && setFullScreenImage(user.avatar_url)}
                                        >
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={40} color="var(--primary)" />
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => handleEditClick(user)} style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)', zIndex: 2 }}>
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                    <h3 style={{ margin: '0.5rem 0 0.25rem 0' }}>{user.full_name}</h3>
                                    <div className="flex flex-wrap justify-center gap-1" style={{ marginBottom: '1.5rem' }}>
                                        {(Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : [])).map((r: string) => (
                                            <span key={r} className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(79,70,229,0.1)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                {ROLE_MAP[r] || r}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 w-full mt-auto pt-4 border-t border-color" style={{ borderColor: 'var(--border-color)' }}>
                                        {user.qr_token ? (
                                            <button onClick={() => setSelectedUserQr(user)} className="button button-outline" style={{ flex: 1, fontSize: '0.75rem', gap: '0.4rem' }}>
                                                <QrCode size={14} /> Kart
                                            </button>
                                        ) : (
                                            <button onClick={() => generateQrToken(user.id)} className="button button-outline" style={{ flex: 1, fontSize: '0.75rem', gap: '0.4rem' }}>
                                                <Key size={14} /> QR
                                            </button>
                                        )}
                                        {user.full_name?.toLowerCase().indexOf('cenk') === -1 && (
                                            <button onClick={() => deleteUser(user.id)} className="button button-outline" style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                            <table className="w-full">
                                <thead style={{ backgroundColor: 'var(--bg-color)' }}>
                                    <tr style={{ textAlign: 'left' }}>
                                        <th style={{ padding: '1rem' }}>Personel</th>
                                        <th style={{ padding: '1rem' }}>Yetki Alanları</th>
                                        <th style={{ padding: '1rem' }}>QR Durum</th>
                                        <th style={{ padding: '1rem' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-color)', cursor: user.avatar_url ? 'zoom-in' : 'default' }}
                                                        onClick={() => user.avatar_url && setFullScreenImage(user.avatar_url)}
                                                    >
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : <User size={20} style={{ margin: '8px' }} color="var(--text-muted)" />}
                                                    </div>
                                                    <strong>{user.full_name}</strong>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex flex-wrap gap-1">
                                                    {(Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : [])).map((r: string) => (
                                                        <span key={r} className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(79,70,229,0.1)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                            {ROLE_MAP[r] || r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {user.qr_token ? <Check size={18} color="var(--success)" /> : <X size={18} color="var(--danger)" />}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditClick(user)} className="button button-outline" style={{ padding: '0.4rem' }}><Edit2 size={16} /></button>
                                                    {user.qr_token && <button onClick={() => setSelectedUserQr(user)} className="button button-outline" style={{ padding: '0.4rem' }}><QrCode size={16} /></button>}
                                                    {user.full_name?.toLowerCase().indexOf('cenk') === -1 && (
                                                        <button onClick={() => deleteUser(user.id)} className="button button-outline" style={{ padding: '0.4rem', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* QR Printing Modal */}
                {selectedUserQr && (
                    <div className="qr-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center', backgroundColor: '#fff', color: '#000', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
                            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <button onClick={() => setSelectedUserQr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'black' }}><X size={24} /></button>
                            </div>

                            <div id="printable-qr" style={{ padding: '1rem', border: '2px solid #000', borderRadius: '16px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', color: '#666' }}>KAYALAR KUMAŞ PERSONEL GİRİŞ KARTI</div>
                                <div style={{ width: '180px', height: '180px', margin: '0 auto 1.5rem auto', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px' }}>
                                    <QRCodeSVG
                                        id="printable-qr-svg"
                                        value={selectedUserQr.qr_token}
                                        size={160}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <h2 style={{ color: 'black', marginBottom: '0.25rem' }}>{selectedUserQr.full_name}</h2>
                                <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: '1rem' }}>{selectedUserQr.roles?.map((r: string) => ROLE_MAP[r] || r).join(' • ')}</p>
                                <div style={{ fontSize: '0.6rem', color: '#999' }}>Bu kart kişiye özeldir, paylaşılamaz.</div>
                            </div>

                            <div className="no-print" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setSelectedUserQr(null)} className="button button-outline" style={{ flex: 1, borderColor: '#ccc', color: '#000' }}>Kapat</button>
                                <button onClick={printQr} className="button" style={{ flex: 1, backgroundColor: '#000', color: '#fff' }}>
                                    <Printer size={18} /> Yazdır
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Full Screen Image Zoom Preview */}
                {fullScreenImage && (
                    <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                        onClick={() => setFullScreenImage(null)}
                    >
                        <button 
                            style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-lg)' }}
                            onClick={() => setFullScreenImage(null)}
                        >
                            <X size={24} />
                        </button>
                        <img 
                            src={fullScreenImage} 
                            alt="Büyük Görsel" 
                            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
