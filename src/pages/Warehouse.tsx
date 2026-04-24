import { useState, useEffect } from 'react';
import { PackagePlus, History, ArrowDownToLine, ArrowUpFromLine, Search, QrCode, X, LayoutGrid, List, Edit } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import BackButton from '../components/BackButton';
import QRPrintModal from '../components/QRPrintModal';
import ImageUploader from '../components/ImageUploader';
import CustomDatePicker from '../components/CustomDatePicker';
import LoadingScreen from '../components/LoadingScreen';
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
    stock_item_id?: string;
};

type StockItem = {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    critical_level: number;
};

export default function Warehouse() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'KUMAŞ' | 'AKSESUAR' | 'KALEMLER'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<Date | null>(null); // Date object
    const [viewMode, setViewMode] = useState<'card' | 'list' | 'history'>('card');
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: itemsData } = await supabase.from('stock_items').select('*');
        if (itemsData) setStockItems(itemsData);
        await fetchMaterials();
    }

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
            
            // Derive global transactions
            const globalTxs = formatted.flatMap(m => m.history.map((h: any) => ({
                ...h,
                materialCode: m.code,
                materialType: m.type,
                materialId: m.id,
                materialImage: m.imageUrls[0]
            }))).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setAllTransactions(globalTxs);
        }
        setLoading(false);
    }

    const handleImageUpdate = async (materialId: string, newUrl: string) => {
        let latestUrls: string[] = [];
        
        setMaterials(prev => {
            const item = prev.find(m => m.id === materialId);
            if (item) {
                latestUrls = [...(item.imageUrls || []), newUrl];
            } else {
                latestUrls = [newUrl];
            }
            return prev.map(m => m.id === materialId ? { ...m, imageUrls: latestUrls } : m);
        });

        const { error } = await supabase.from('materials').update({ image_urls: latestUrls }).eq('id', materialId);
        if (error) {
            console.error('DB Update Error:', error);
            alert('Görsel veritabanına kaydedilemedi: ' + error.message);
        }
    };

    const handleImageRemove = async (materialId: string, urlToRemove: string) => {
        let latestUrls: string[] = [];
        
        setMaterials(prev => {
            const item = prev.find(m => m.id === materialId);
            if (item) {
                latestUrls = item.imageUrls.filter(u => u !== urlToRemove);
            }
            return prev.map(m => m.id === materialId ? { ...m, imageUrls: latestUrls } : m);
        });

        const { error } = await supabase.from('materials').update({ image_urls: latestUrls }).eq('id', materialId);
        if (error) {
            console.error('DB Delete Error:', error);
            alert('Görsel silinemedi: ' + error.message);
        }
    };

    // Modals
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedMat, setSelectedMat] = useState<Material | null>(null);
    const [qrModalMat, setQrModalMat] = useState<Material | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    // Partial Add Form State
    const [selectedStockItemId, setSelectedStockItemId] = useState('');
    const [newTotal, setNewTotal] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newSupplier, setNewSupplier] = useState('');

    // Stock Item Add Form State
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemCategory, setItemCategory] = useState('Kumaş (Fon)');
    const [itemUnit, setItemUnit] = useState('Metre');
    const [itemCriticalLevel, setItemCriticalLevel] = useState('10');

    const handleEditStockItem = (item: StockItem) => {
        setEditingItemId(item.id);
        setItemCode(item.code);
        setItemName(item.name);
        setItemCategory(item.category);
        setItemUnit(item.unit);
        setItemCriticalLevel(item.critical_level.toString());
        setShowAddItemForm(true);
    };

    const handleAddStockItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemCode || !itemName) return;

        const itemData = {
            code: itemCode,
            name: itemName,
            category: itemCategory,
            unit: itemUnit,
            critical_level: parseFloat(itemCriticalLevel) || 0
        };

        if (editingItemId) {
            const { error } = await supabase.from('stock_items').update(itemData).eq('id', editingItemId);
            if (error) {
                alert('Hata: ' + error.message);
                return;
            }
        } else {
            const { error } = await supabase.from('stock_items').insert([itemData]);
            if (error) {
                alert('Hata: ' + error.message);
                return;
            }
        }

        await fetchData(); // refresh items
        setShowAddItemForm(false);
        setEditingItemId(null);
        setItemCode(''); setItemName(''); setItemCriticalLevel('10');
    };

    const handleDeleteStockItem = async (id: string) => {
        if (!window.confirm('Bu stok kalemini silmek istediğinize emin misiniz?')) return;
        
        const { error } = await supabase.from('stock_items').delete().eq('id', id);
        if (error) {
            alert('Hata: ' + error.message);
        } else {
            await fetchData();
        }
    };

    // Partial Stock Update Form State
    const [updateType, setUpdateType] = useState<'OUT' | 'IN'>('OUT');
    const [updateAmount, setUpdateAmount] = useState('');
    const [updateNote, setUpdateNote] = useState('');

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStockItemId || !newTotal) return;

        const selectedItem = stockItems.find(i => i.id === selectedStockItemId);
        if (!selectedItem) return;

        const matId = `MAT-${Date.now().toString().slice(-4)}`;
        const totalVal = parseFloat(newTotal);

        const newMaterial = {
            id: matId,
            stock_item_id: selectedItem.id,
            code: selectedItem.code, // we store the item code for display
            type: selectedItem.category, // store category as type for display
            total: totalVal,
            current: totalVal,
            critical: selectedItem.critical_level,
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
        setSelectedStockItemId(''); setNewTotal(''); setNewLocation(''); setNewSupplier('');
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
        
        let matchesDate = true;
        if (dateFilter) {
            const filterDateStr = dateFilter.toLocaleDateString();
            const entryDateStr = new Date(m.created_at).toLocaleDateString();
            matchesDate = entryDateStr === filterDateStr;
        }
        
        return matchesTab && matchesSearch && matchesDate;
    });

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <BackButton path="/dashboard" />
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                {loading && <LoadingScreen fullScreen message="Stok bilgileri yükleniyor..." />}

                <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h2>Depo ve Stok Yönetimi</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Malzeme hareketleri ve anlık envanter takibi.</p>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'KALEMLER' ? (
                            <button onClick={() => { 
                                if (showAddItemForm) {
                                    setEditingItemId(null);
                                    setItemCode(''); setItemName(''); setItemCriticalLevel('10');
                                }
                                setShowAddItemForm(!showAddItemForm); 
                            }} className="button">
                                <PackagePlus size={20} />
                                {showAddItemForm ? 'İptal' : 'Yeni Kalem Tanımla'}
                            </button>
                        ) : (
                            <>
                                <div className="flex bg-bgColor" style={{ padding: '0.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                    <button 
                                        onClick={() => setViewMode('card')} 
                                        title="Kart Görünümü"
                                        style={{ padding: '0.5rem', border: 'none', backgroundColor: (viewMode === 'card') ? 'var(--card-bg)' : 'transparent', color: (viewMode === 'card') ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: (viewMode === 'card') ? 'var(--shadow-sm)' : 'none' }}>
                                        <LayoutGrid size={20} />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('list')} 
                                        title="Liste Görünümü"
                                        style={{ padding: '0.5rem', border: 'none', backgroundColor: (viewMode === 'list') ? 'var(--card-bg)' : 'transparent', color: (viewMode === 'list') ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: (viewMode === 'list') ? 'var(--shadow-sm)' : 'none' }}>
                                        <List size={20} />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('history')} 
                                        title="Tüm Hareket Geçmişi"
                                        style={{ padding: '0.5rem', border: 'none', backgroundColor: (viewMode === 'history') ? 'var(--card-bg)' : 'transparent', color: (viewMode === 'history') ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', boxShadow: (viewMode === 'history') ? 'var(--shadow-sm)' : 'none' }}>
                                        <History size={20} />
                                    </button>
                                </div>
                                <button onClick={() => { setShowAddForm(!showAddForm); setSelectedMat(null); }} className="button">
                                    <PackagePlus size={20} />
                                    {showAddForm ? 'İptal' : 'Yeni Rulo Ekle'}
                                </button>
                            </>
                        )}
                    </div>
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

                    {/* Date Filter */}
                    <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tarihe Göre:</label>
                        <CustomDatePicker 
                            selected={dateFilter} 
                            onChange={setDateFilter} 
                            placeholderText="Tarih seç..."
                        />
                        {dateFilter && (
                            <button onClick={() => setDateFilter(null)} className="button button-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex bg-bgColor" style={{ padding: '0.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)' }}>
                        {['ALL', 'KUMAŞ', 'AKSESUAR', 'KALEMLER'].map(tab => (
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
                                {tab === 'ALL' ? 'Tümü' : tab === 'KALEMLER' ? 'Tanımlar' : tab}
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
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Stok Kalemi Seç *</label>
                                    <select className="input" value={selectedStockItemId} onChange={e => setSelectedStockItemId(e.target.value)} required>
                                        <option value="">-- Lütfen Seçin --</option>
                                        {stockItems.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.code} - {item.name} ({item.category})
                                            </option>
                                        ))}
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

                {/* Stock Items View */}
                {activeTab === 'KALEMLER' ? (
                    <>
                        {showAddItemForm && (
                            <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                                <h3 style={{ marginBottom: '1rem' }}>{editingItemId ? 'Stok Kalemini Düzenle' : 'Yeni Stok Kalemi Tanımla'}</h3>
                                <form onSubmit={handleAddStockItem} className="flex flex-col gap-4">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Stok Kodu *</label>
                                            <input type="text" className="input" placeholder="Örn: K-890" value={itemCode} onChange={e => setItemCode(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ürün Adı / Açıklama *</label>
                                            <input type="text" className="input" placeholder="Örn: Siyah Pamuk Fon" value={itemName} onChange={e => setItemName(e.target.value)} required />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kategori *</label>
                                            <select className="input" value={itemCategory} onChange={e => setItemCategory(e.target.value)}>
                                                <option>Kumaş (Fon)</option>
                                                <option>Kumaş (Tül)</option>
                                                <option>Kumaş (Store)</option>
                                                <option>Aksesuar</option>
                                                <option>Motorlu Mekanizma</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Birim *</label>
                                            <select className="input" value={itemUnit} onChange={e => setItemUnit(e.target.value)}>
                                                <option>Metre</option>
                                                <option>Adet</option>
                                                <option>Kg</option>
                                                <option>Kutu</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kritik Stok Seviyesi</label>
                                            <input type="number" className="input" placeholder="Uyarı verilecek miktar" value={itemCriticalLevel} onChange={e => setItemCriticalLevel(e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="submit" className="button" style={{ alignSelf: 'flex-start' }}>
                                        {editingItemId ? 'Güncelle' : 'Kaydet'}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div className="card animate-fade-in" style={{ padding: 0, overflowX: 'auto' }}>
                            <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Stok Kodu</th>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Adı</th>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Kategori</th>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Birim</th>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Kritik Seviye</th>
                                        <th style={{ padding: '1rem', fontSize: '0.85rem' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockItems.filter(i => 
                                        i.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        i.category.toLowerCase().includes(searchQuery.toLowerCase())
                                    ).map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{item.code}</td>
                                            <td style={{ padding: '1rem' }}>{item.name}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{item.category}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{item.unit}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className="badge" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                                                    {item.critical_level} {item.unit}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditStockItem(item)} className="button button-outline" style={{ padding: '0.4rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                                                    <Edit size={16} /> Düzenle
                                                </button>
                                                <button onClick={() => handleDeleteStockItem(item.id)} className="button button-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                                    <X size={16} /> Sil
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {stockItems.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Kayıtlı stok kalemi bulunamadı.
                                </div>
                            )}
                        </div>
                    </>
                ) : viewMode === 'history' ? (
                    <div className="card animate-fade-in" style={{ padding: 0, overflowX: 'auto' }}>
                         <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Tarih</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Görsel</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Malzeme</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>İşlem</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Miktar</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Not</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTransactions.filter(tx => {
                                    const matchesSearch = tx.materialCode.toLowerCase().includes(searchQuery.toLowerCase()) || tx.note.toLowerCase().includes(searchQuery.toLowerCase());
                                    let matchesDate = true;
                                    if (dateFilter) {
                                        matchesDate = new Date(tx.created_at).toLocaleDateString() === dateFilter.toLocaleDateString();
                                    }
                                    return matchesSearch && matchesDate;
                                }).map((tx, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(tx.created_at).toLocaleString('tr-TR')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {tx.materialImage ? (
                                                <img 
                                                    src={tx.materialImage} 
                                                    alt={tx.materialCode} 
                                                    onClick={(e) => { e.stopPropagation(); setFullScreenImage(tx.materialImage); }}
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'zoom-in' }} 
                                                />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-color)', borderRadius: '6px', border: '1px dotted var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <LayoutGrid size={16} color="var(--text-muted)" opacity={0.5} />
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{tx.materialCode}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.materialType}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {tx.type === 'IN' ? (
                                                <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                                    <ArrowDownToLine size={16} /> GİRİŞ
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                                                    <ArrowUpFromLine size={16} /> ÇIKIŞ
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 700 }}>
                                            {tx.type === 'IN' ? '+' : '-'}{tx.amount}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{tx.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="card-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '3rem', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                        ) : filteredMaterials.map(m => (
                            <div key={m.id} className="card" style={{
                                borderTop: `6px solid ${m.current <= m.critical ? 'var(--danger)' : 'var(--primary)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column'
                            }} onClick={() => { setSelectedMat(m); setShowAddForm(false); }}>
                                <div className="flex justify-between items-start" style={{ marginBottom: '1.25rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{m.type}</div>
                                        <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>{m.code}</h3>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString('tr-TR')}</div>
                                        {m.current <= m.critical && (
                                            <span className="badge badge-error" style={{ fontSize: '0.65rem' }}>Kritik Seviye</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                                    <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mevcut Stok:</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: m.current <= m.critical ? 'var(--danger)' : 'var(--text-main)' }}>
                                            {m.current} {m.type.includes('Kumaş') ? 'mt' : 'ad'}
                                        </span>
                                    </div>
                                    <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((m.current / m.total) * 100, 100)}%`,
                                            backgroundColor: m.current <= m.critical ? 'var(--danger)' : 'var(--success)',
                                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </div>
                                </div>

                                <div className="flex justify-between items-end" style={{ marginTop: 'auto' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Raf: <strong>{m.location}</strong><br/>
                                        Tedarikçi: <strong>{m.supplier}</strong>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setQrModalMat(m); }} className="button button-outline" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <QrCode size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Stok Kodu</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Tip</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Giriş Tarihi</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Konum / Tedarikçi</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Durum</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Miktar</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setSelectedMat(m)}>
                                        <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{m.code}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{m.type}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString('tr-TR')}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                            <div style={{ fontWeight: 600 }}>{m.location}</div>
                                            <div style={{ color: 'var(--text-muted)' }}>{m.supplier}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {m.current <= m.critical ? (
                                                <span className="badge badge-error">Kritik</span>
                                            ) : (
                                                <span className="badge badge-success">Normal</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{m.current} mt/ad</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Toplam: {m.total}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button onClick={(e) => { e.stopPropagation(); setQrModalMat(m); }} className="button button-outline" style={{ padding: '0.4rem', border: 'none' }}><QrCode size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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
                                onImageRemoved={(url) => handleImageRemove(selectedMat!.id, url)}
                            />
                        </div>

                        {/* QR Etiketi Bas */}
                        <button onClick={() => setQrModalMat(selectedMat)} className="button w-full" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
                            <QrCode size={18} /> QR Etiket Bas
                        </button>

                    </div>
                </div>
            )}

            {/* FULL SCREEN IMAGE OVERLAY */}
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
