import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PackagePlus, AlertTriangle, History, ArrowDownToLine, ArrowUpFromLine, Search, QrCode } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import QRPrintModal from '../components/QRPrintModal';
import ImageUploader from '../components/ImageUploader';
import { supabase } from '../lib/supabase';

// DB tipleri
type Transaction = { created_at: string, type: 'IN' | 'OUT', amount: number, user_id: string, note: string };
type Material = {
    id: string;
    code: string;
    type: string;
    total: number;
    current: number;
    critical: number;
    location: string;
    supplier: string;
    created_at: string;
    inventory_transactions?: Transaction[];
    history: Transaction[];
    imageUrls: string[];
};

export default function Warehouse() {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'KUMAŞ' | 'AKSESUAR'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchMaterials();
    }, []);

    async function fetchMaterials() {
        setLoading(true);
        const { data, error } = await supabase
            .from('materials')
            .select('*, inventory_transactions(*) ')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch error:', error);
        } else {
            const formatted = (data || []).map(m => ({
                id: m.id,
                code: m.code,
                type: m.type,
                total: m.total,
                current: m.current,
                critical: m.critical,
                location: m.location,
                supplier: m.supplier,
                created_at: m.created_at,
                imageUrls: m.image_urls || [],
                history: (m.inventory_transactions || []).sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            }));
            setMaterials(formatted);
        }
        setLoading(false);
    }

    const handleImageUpdate = async (materialId: string, newUrl: string) => {
        const item = materials.find(m => m.id === materialId);
        if (!item) return;

        const updatedUrls = [...item.imageUrls, newUrl];

        const { error } = await supabase
            .from('materials')
            .update({ image_urls: updatedUrls })
            .eq('id', materialId);

        if (error) {
            alert('Resim kaydedilemedi: ' + error.message);
        } else {
            setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, imageUrls: updatedUrls } : m));
        }
    };

    // Modals
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedMat, setSelectedMat] = useState<Material | null>(null);
    const [qrModalMat, setQrModalMat] = useState<Material | null>(null);

    // Partial Add Form State
    const [newCode, setNewCode] = useState('');
    const [newType, setNewType] = useState('Kumaş (Fon)');
    const [newTotal, setNewTotal] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newSupplier, setNewSupplier] = useState('');

    // Partial Stock Update Form State
    const [updateType, setUpdateType] = useState<'OUT' | 'IN'>('OUT');
    const [updateAmount, setUpdateAmount] = useState('');
    const [updateNote, setUpdateNote] = useState('');

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode || !newTotal) return;

        const matId = `MAT-${Date.now().toString().slice(-4)}`;
        const totalVal = parseFloat(newTotal);

        const newMaterial = {
            id: matId,
            code: newCode,
            type: newType,
            total: totalVal,
            current: totalVal,
            critical: newType.includes('Kumaş') ? 10 : 20,
            location: newLocation || 'Belirtilmedi',
            supplier: newSupplier || 'Belirtilmedi',
        };

        const { error } = await supabase.from('materials').insert([newMaterial]);

        if (error) {
            alert('Hata: ' + error.message);
            return;
        }

        // Add initial transaction
        await supabase.from('inventory_transactions').insert([{
            material_id: matId,
            type: 'IN',
            amount: totalVal,
            note: 'İlk Giriş',
            user_id: null
        }]);

        await fetchMaterials();
        setShowAddForm(false);
        setQrModalMat({ ...newMaterial, history: [] } as any);
        setNewCode(''); setNewTotal(''); setNewLocation(''); setNewSupplier('');
    };

    const handleUpdateStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMat || !updateAmount || isNaN(Number(updateAmount))) return;

        const amountVal = parseFloat(updateAmount);
        if (updateType === 'OUT' && amountVal > selectedMat.current) {
            alert("Stoktaki miktardan fazlası düşülemez!");
            return;
        }

        const newCurrent = updateType === 'IN' ? selectedMat.current + amountVal : selectedMat.current - amountVal;
        const newTotal = updateType === 'IN' ? selectedMat.total + amountVal : selectedMat.total;

        const { error: updateError } = await supabase
            .from('materials')
            .update({ current: newCurrent, total: newTotal })
            .eq('id', selectedMat.id);

        if (updateError) {
            alert('Hata: ' + updateError.message);
            return;
        }

        await supabase.from('inventory_transactions').insert([{
            material_id: selectedMat.id,
            type: updateType,
            amount: amountVal,
            note: updateNote || 'Manuel Güncelleme',
            user_id: null
        }]);

        await fetchMaterials();
        setSelectedMat(null);
        setUpdateAmount('');
        setUpdateNote('');
    };

    const filteredMaterials = materials.filter(m => {
        const matchesTab = activeTab === 'ALL' || (activeTab === 'KUMAŞ' && m.type.includes('Kumaş')) || (activeTab === 'AKSESUAR' && !m.type.includes('Kumaş'));
        const matchesSearch = m.code.toLowerCase().includes(searchQuery.toLowerCase()) || m.type.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} />
                    Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                {loading && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
                        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                    </div>
                )}

                <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h2>Depo ve Stok Yönetimi</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Malzeme hareketleri ve anlık envanter takibi.</p>
                    </div>
                    <button onClick={() => { setShowAddForm(!showAddForm); setSelectedMat(null); }} className="button">
                        <PackagePlus size={20} />
                        {showAddForm ? 'İptal' : 'Yeni Rulo Ekle'}
                    </button>
                </div>

                {/* Toolbar: Search and Filters */}
                <div className="card flex items-center gap-4 flex-wrap" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="QR ID, Kumaş Kodu veya Tip Ara..."
                            style={{ paddingLeft: '2.5rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex bg-bgColor" style={{ padding: '0.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)' }}>
                        {['ALL', 'KUMAŞ', 'AKSESUAR'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    backgroundColor: activeTab === tab ? 'var(--card-bg)' : 'transparent',
                                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: activeTab === tab ? 600 : 400,
                                    cursor: 'pointer',
                                    boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                                }}
                            >
                                {tab === 'ALL' ? 'Tümü' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {showAddForm && (
                    <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Depoya Yeni Rulo / Ürün Girişi</h3>
                        <form onSubmit={handleAddMaterial} className="flex flex-col gap-4">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ürün / Kumaş Kodu *</label>
                                    <input type="text" className="input" placeholder="Örn: K-890" value={newCode} onChange={e => setNewCode(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tür *</label>
                                    <select className="input" value={newType} onChange={e => setNewType(e.target.value)}>
                                        <option>Kumaş (Fon)</option>
                                        <option>Kumaş (Tül)</option>
                                        <option>Kumaş (Store)</option>
                                        <option>Aksesuar</option>
                                        <option>Motorlu Mekanizma</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Gelen Miktar *</label>
                                    <input type="number" step="0.01" className="input" placeholder="Metre / Adet" value={newTotal} onChange={e => setNewTotal(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Raf Konumu</label>
                                    <input type="text" className="input" placeholder="Örn: Raf A-12" value={newLocation} onChange={e => setNewLocation(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tedarikçi</label>
                                    <input type="text" className="input" placeholder="Firma Adı" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} />
                                </div>
                            </div>
                            <button type="submit" className="button" style={{ alignSelf: 'flex-start' }}>Kaydet ve QR Oluştur</button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredMaterials.map(mat => (
                        <div
                            key={mat.id}
                            className="card"
                            style={{
                                borderLeft: mat.current <= mat.critical ? '4px solid var(--danger)' : '4px solid var(--success)',
                                cursor: 'pointer'
                            }}
                            onClick={() => { setSelectedMat(mat); setShowAddForm(false); }}
                        >
                            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                <span className="badge badge-success" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>{mat.id}</span>
                                {mat.current <= mat.critical && (
                                    <span className="badge badge-warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                        <AlertTriangle size={12} style={{ marginRight: '4px' }} />Kritik Stok
                                    </span>
                                )}
                            </div>

                            <h3 style={{ fontSize: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {mat.code}
                                <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>{mat.location}</span>
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>{mat.type} • {mat.supplier}</p>

                            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                                <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Kalan / Toplam</span>
                                    <span style={{ fontWeight: 600, color: mat.current <= mat.critical ? 'var(--danger)' : 'var(--text-main)' }}>
                                        {mat.current} / {mat.total} {mat.type.includes('Kumaş') ? 'm' : 'Adet'}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (mat.current / mat.total) * 100)}%`,
                                        backgroundColor: mat.current <= mat.critical ? 'var(--danger)' : 'var(--primary)',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </main>

            {/* DETAY VE TAKİP MODALI */}
            {selectedMat && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', justifyContent: 'flex-end', zIndex: 100
                }}>
                    <div className="animate-fade-in" style={{
                        width: '100%', maxWidth: '500px', backgroundColor: 'var(--card-bg)', height: '100%',
                        overflowY: 'auto', padding: '2rem', borderLeft: '1px solid var(--border-color)',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Detay: {selectedMat.code}
                            </h2>
                            <button onClick={() => setSelectedMat(null)} className="button button-outline" style={{ padding: '0.5rem' }}>Kapat</button>
                        </div>

                        {/* Status Card */}
                        <div style={{ backgroundColor: 'var(--bg-color)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                            <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mevcut Bakiye</p>
                                    <h3 style={{ fontSize: '2rem', color: selectedMat.current <= selectedMat.critical ? 'var(--danger)' : 'var(--text-main)' }}>
                                        {selectedMat.current} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{selectedMat.type.includes('Kumaş') ? 'Metre' : 'Adet'}</span>
                                    </h3>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="badge" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>{selectedMat.id}</div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Raf: {selectedMat.location}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Add/Remove Stock Form */}
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📦 Manuel Stok Ayarlama</h3>
                        <form onSubmit={handleUpdateStock} className="card" style={{ marginBottom: '2rem', backgroundColor: 'var(--bg-color)' }}>
                            <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
                                <select className="input" value={updateType} onChange={(e) => setUpdateType(e.target.value as any)} style={{ flex: 1 }}>
                                    <option value="OUT">📉 Stok Düş (Çıkış)</option>
                                    <option value="IN">📈 Stok Ekle (Giriş)</option>
                                </select>
                                <input
                                    type="number" step="0.01" className="input" placeholder="Miktar..."
                                    value={updateAmount} onChange={e => setUpdateAmount(e.target.value)}
                                    style={{ flex: 1 }} required
                                />
                            </div>
                            <input
                                type="text" className="input" placeholder="İşlem Notu (Örn: Sipariş No veya Sevkiyat Nedeni)"
                                value={updateNote} onChange={e => setUpdateNote(e.target.value)}
                                style={{ marginBottom: '1rem' }} required
                            />
                            <button type="submit" className="button w-full">İşlemi Kaydet</button>
                        </form>

                        {/* Transaction History */}
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} /> Hareket Geçmişi (Logs)
                        </h3>
                        <div className="flex-col gap-2" style={{ flex: 1 }}>
                            {selectedMat.history.map((tx: Transaction, idx: number) => (
                                <div key={idx} style={{
                                    padding: '1rem', borderBottom: '1px solid var(--border-color)',
                                    display: 'flex', alignItems: 'flex-start', gap: '1rem'
                                }}>
                                    <div style={{
                                        backgroundColor: tx.type === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: tx.type === 'IN' ? 'var(--success)' : 'var(--danger)',
                                        padding: '0.5rem', borderRadius: '50%'
                                    }}>
                                        {tx.type === 'IN' ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="flex justify-between">
                                            <span style={{ fontWeight: 600 }}>{tx.type === 'IN' ? '+' : '-'}{tx.amount} {selectedMat.type.includes('Kumaş') ? 'Metre' : 'Adet'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{tx.note}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>İşlem ID: {tx.user_id || 'Sistem'}</p>
                                    </div>
                                </div>
                            ))}
                            {(!selectedMat.history || selectedMat.history.length === 0) && (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Henüz kayıt yok.</p>
                            )}
                        </div>

                        {/* Stok Görseli Yükleme */}
                        <div style={{ marginTop: '1.5rem' }}>
                            <ImageUploader
                                label="📸 Ürün / Rulo Görseli (WebP)"
                                entityId={selectedMat.id}
                                existingImages={selectedMat.imageUrls}
                                onImageSaved={(url) => handleImageUpdate(selectedMat!.id, url)}
                            />
                        </div>

                        {/* QR Etiketi Bas */}
                        <button onClick={() => setQrModalMat(selectedMat)} className="button w-full" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
                            <QrCode size={18} /> QR Etiket Bas
                        </button>

                    </div>
                </div>
            )}

            {/* QR Print Modal */}
            {qrModalMat && (
                <QRPrintModal
                    id={qrModalMat.id}
                    label={`${qrModalMat.code} • ${qrModalMat.type}`}
                    subLabel={`Raf: ${qrModalMat.location} • ${qrModalMat.supplier}`}
                    onClose={() => setQrModalMat(null)}
                />
            )}

        </div>
    );
}
