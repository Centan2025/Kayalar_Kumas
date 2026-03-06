import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import QRPrintModal from '../components/QRPrintModal';
import ImageUploader from '../components/ImageUploader';
import { supabase } from '../lib/supabase';

export type OrderStatus = 'PENDING' | 'CUTTING' | 'SEWING' | 'QC' | 'READY' | 'IN_TRANSIT' | 'DELIVERED';

export const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
    PENDING: { label: 'Beklemede', color: '#6b7280' },
    CUTTING: { label: 'Kesimde', color: '#8b5cf6' },
    SEWING: { label: 'Dikimde', color: '#f59e0b' },
    QC: { label: 'Kalite Kontrol', color: '#3b82f6' },
    READY: { label: 'Paketlemeye Hazır', color: '#10b981' },
    IN_TRANSIT: { label: 'Yolda', color: '#f97316' },
    DELIVERED: { label: 'Teslim Edildi', color: '#059669' },
};

export type Order = {
    id: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    invoiceName: string;
    invoiceTaxNo: string;
    invoiceAddress: string;
    fabricCode: string;
    mechanism: string;
    width: number;
    height: number;
    pileRatio: number;
    status: OrderStatus;
    notes: string;
    createdAt: string;
    deliveryDate: string;
    revisionCount: number;
    parentOrderId: string | null;
    parts: number;
    imageUrls: string[];
};

// Shared mock data — export for use in Scanner, QC, etc.
export const INITIAL_ORDERS: Order[] = [
    { id: 'ORD-1029', customerName: 'Ayşe Yılmaz', customerPhone: '0532 111 22 33', customerAddress: 'Bağdat Cad. No:42 Daire:5', customerCity: 'İstanbul / Kadıköy', invoiceName: 'Ayşe Yılmaz', invoiceTaxNo: '', invoiceAddress: 'Bağdat Cad. No:42 Kadıköy/İstanbul', fabricCode: 'K-900', mechanism: 'Motorlu', width: 320, height: 260, pileRatio: 2.5, status: 'SEWING', notes: 'Lazer kesim yapılacak', createdAt: '2026-03-01', deliveryDate: '2026-03-10', revisionCount: 0, parentOrderId: null, parts: 2, imageUrls: [] },
    { id: 'ORD-1050', customerName: 'Mehmet Demir', customerPhone: '0533 444 55 66', customerAddress: 'Atatürk Bulvarı No:88', customerCity: 'Ankara / Çankaya', invoiceName: 'Demir Mobilya Ltd.', invoiceTaxNo: '1234567890', invoiceAddress: 'Atatürk Bulvarı No:88 Çankaya/Ankara', fabricCode: 'T-120', mechanism: 'Manuel', width: 200, height: 240, pileRatio: 2.0, status: 'QC', notes: '', createdAt: '2026-03-03', deliveryDate: '2026-03-12', revisionCount: 1, parentOrderId: 'ORD-1049', parts: 1, imageUrls: [] },
    { id: 'ORD-1051', customerName: 'Fatma Kara', customerPhone: '0535 777 88 99', customerAddress: 'Cumhuriyet Mah. 123 Sok. No:7', customerCity: 'İzmir / Karşıyaka', invoiceName: 'Fatma Kara', invoiceTaxNo: '', invoiceAddress: 'Cumhuriyet Mah. 123 Sok. No:7 Karşıyaka/İzmir', fabricCode: 'K-900', mechanism: 'Raylı', width: 400, height: 300, pileRatio: 3.0, status: 'PENDING', notes: 'Salon fon perde + tül', createdAt: '2026-03-05', deliveryDate: '2026-03-15', revisionCount: 0, parentOrderId: null, parts: 3, imageUrls: [] },
    { id: 'ORD-1052', customerName: 'Ali Öztürk', customerPhone: '0537 000 11 22', customerAddress: 'Sahil Yolu Cd. No:15', customerCity: 'Antalya / Muratpaşa', invoiceName: 'Ali Öztürk', invoiceTaxNo: '', invoiceAddress: 'Sahil Yolu Cd. No:15 Muratpaşa/Antalya', fabricCode: 'S-200', mechanism: 'Motorlu', width: 180, height: 220, pileRatio: 1.0, status: 'DELIVERED', notes: 'Store perde', createdAt: '2026-02-20', deliveryDate: '2026-03-01', revisionCount: 0, parentOrderId: null, parts: 1, imageUrls: [] },
];

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
    const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

    const [f, setF] = useState({
        customerName: '', customerPhone: '', customerAddress: '', customerCity: '',
        invoiceName: '', invoiceTaxNo: '', invoiceAddress: '',
        fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '',
        notes: '', deliveryDate: '', parts: '1'
    });

    useEffect(() => {
        fetchOrders();
    }, []);

    async function fetchOrders() {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch error:', error);
        } else {
            // Map snake_case to camelCase
            const mapped = (data || []).map((o: any) => ({
                id: o.id,
                customerName: o.customer_name,
                customerPhone: o.customer_phone,
                customerAddress: o.customer_address,
                customerCity: o.customer_city,
                invoiceName: o.invoice_name,
                invoiceTaxNo: o.invoice_tax_no,
                invoiceAddress: o.invoice_address,
                fabricCode: o.fabric_code,
                mechanism: o.mechanism,
                width: o.width,
                height: o.height,
                pileRatio: o.pile_ratio,
                status: o.status,
                notes: o.notes,
                createdAt: o.created_at,
                deliveryDate: o.delivery_date,
                revisionCount: o.revision_count,
                parentOrderId: o.parent_order_id,
                parts: o.parts,
                imageUrls: o.image_urls || []
            }));
            setOrders(mapped);
        }
        setLoading(false);
    }

    const handleImageUpdate = async (orderId: string, newUrl: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedUrls = [...order.imageUrls, newUrl];

        const { error } = await supabase
            .from('orders')
            .update({ image_urls: updatedUrls })
            .eq('id', orderId);

        if (error) {
            alert('Resim kaydedilemedi: ' + error.message);
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, imageUrls: updatedUrls } : o));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const orderId = `ORD-${Date.now().toString().slice(-4)}`;

        const newOrderObj = {
            id: orderId,
            customer_name: f.customerName,
            customer_phone: f.customerPhone,
            customer_address: f.customerAddress,
            customer_city: f.customerCity,
            invoice_name: f.invoiceName || f.customerName,
            invoice_tax_no: f.invoiceTaxNo,
            invoice_address: f.invoiceAddress || f.customerAddress,
            fabric_code: f.fabricCode,
            mechanism: f.mechanism,
            width: parseFloat(f.width),
            height: parseFloat(f.height),
            pile_ratio: parseFloat(f.pileRatio) || 2.0,
            status: 'PENDING',
            notes: f.notes,
            delivery_date: f.deliveryDate,
            parts: parseInt(f.parts) || 1
        };

        const { error } = await supabase.from('orders').insert([newOrderObj]);

        if (error) {
            alert('Hata: ' + error.message);
            return;
        }

        await fetchOrders();
        setShowForm(false);
        // Map back for the modal
        setQrModalOrder({
            ...newOrderObj,
            customerName: newOrderObj.customer_name,
            fabricCode: newOrderObj.fabric_code,
            mechanism: newOrderObj.mechanism,
            width: newOrderObj.width,
            height: newOrderObj.height,
            deliveryDate: newOrderObj.delivery_date,
            createdAt: new Date().toISOString()
        } as any);

        setF({ customerName: '', customerPhone: '', customerAddress: '', customerCity: '', invoiceName: '', invoiceTaxNo: '', invoiceAddress: '', fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '', notes: '', deliveryDate: '', parts: '1' });
    };

    const filteredOrders = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter);
    const allStatuses: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'CUTTING', 'SEWING', 'QC', 'READY', 'IN_TRANSIT', 'DELIVERED'];

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h2>Sipariş Yönetimi</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Tüm siparişleri oluştur, takip et ve yönet.</p>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="button">
                        <Plus size={20} /> {showForm ? 'İptal' : 'Yeni Sipariş'}
                    </button>
                </div>

                {/* Status Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', marginBottom: '1.5rem', padding: '0.25rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                    {allStatuses.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} style={{
                            padding: '0.5rem 0.75rem', border: 'none', borderRadius: 'var(--radius-md)',
                            backgroundColor: statusFilter === s ? 'var(--card-bg)' : 'transparent',
                            color: statusFilter === s ? (s === 'ALL' ? 'var(--primary)' : STATUS_LABELS[s as OrderStatus].color) : 'var(--text-muted)',
                            fontWeight: statusFilter === s ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: statusFilter === s ? 'var(--shadow-sm)' : 'none',
                        }}>
                            {s === 'ALL' ? `Tümü (${orders.length})` : `${STATUS_LABELS[s].label} (${orders.filter(o => o.status === s).length})`}
                        </button>
                    ))}
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Yeni Sipariş Oluştur</h3>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4">

                            {/* Müşteri Bilgileri */}
                            <h4 style={{ margin: '0.5rem 0 0 0', color: 'var(--primary)', fontSize: '0.9rem' }}>👤 Müşteri Bilgileri</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Müşteri Adı *</label>
                                    <input className="input" required value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })} placeholder="Ad Soyad" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Telefon *</label>
                                    <input className="input" required value={f.customerPhone} onChange={e => setF({ ...f, customerPhone: e.target.value })} placeholder="0532 ..." /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>İl / İlçe</label>
                                    <input className="input" value={f.customerCity} onChange={e => setF({ ...f, customerCity: e.target.value })} placeholder="İstanbul / Kadıköy" /></div>
                            </div>
                            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Teslimat Adresi *</label>
                                <input className="input" required value={f.customerAddress} onChange={e => setF({ ...f, customerAddress: e.target.value })} placeholder="Mahalle, Sokak, Bina No, Daire" /></div>

                            {/* Fatura Bilgileri */}
                            <h4 style={{ margin: '0.5rem 0 0 0', color: 'var(--primary)', fontSize: '0.9rem' }}>🧾 Fatura Bilgileri</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Fatura Adı / Unvanı</label>
                                    <input className="input" value={f.invoiceName} onChange={e => setF({ ...f, invoiceName: e.target.value })} placeholder="Boş bırakılırsa müşteri adı kullanılır" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Vergi No / TC Kimlik</label>
                                    <input className="input" value={f.invoiceTaxNo} onChange={e => setF({ ...f, invoiceTaxNo: e.target.value })} placeholder="Bireysel ise TC, kurumsal ise VKN" /></div>
                            </div>
                            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Fatura Adresi</label>
                                <input className="input" value={f.invoiceAddress} onChange={e => setF({ ...f, invoiceAddress: e.target.value })} placeholder="Boş bırakılırsa teslimat adresi kullanılır" /></div>

                            {/* Ürün Detayları */}
                            <h4 style={{ margin: '0.5rem 0 0 0', color: 'var(--primary)', fontSize: '0.9rem' }}>📐 Ürün Detayları</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Kumaş Kodu *</label>
                                    <input className="input" required value={f.fabricCode} onChange={e => setF({ ...f, fabricCode: e.target.value })} placeholder="K-900" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Mekanizma</label>
                                    <select className="input" value={f.mechanism} onChange={e => setF({ ...f, mechanism: e.target.value })}>
                                        <option>Manuel</option><option>Motorlu</option><option>Raylı</option><option>İpli</option>
                                    </select></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>En (cm) *</label>
                                    <input type="number" className="input" required value={f.width} onChange={e => setF({ ...f, width: e.target.value })} placeholder="320" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Boy (cm) *</label>
                                    <input type="number" className="input" required value={f.height} onChange={e => setF({ ...f, height: e.target.value })} placeholder="260" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Pile Oranı</label>
                                    <input type="number" step="0.1" className="input" value={f.pileRatio} onChange={e => setF({ ...f, pileRatio: e.target.value })} placeholder="2.5" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Parça Sayısı</label>
                                    <input type="number" className="input" value={f.parts} onChange={e => setF({ ...f, parts: e.target.value })} placeholder="1" /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Teslim Tarihi</label>
                                    <input type="date" className="input" value={f.deliveryDate} onChange={e => setF({ ...f, deliveryDate: e.target.value })} /></div>
                            </div>
                            <div><label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Özel Notlar</label>
                                <input className="input" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Lazer kesim, özel dikiş vb." /></div>
                            <button type="submit" className="button" style={{ alignSelf: 'flex-start' }}>Siparişi Kaydet ve QR Oluştur</button>
                        </form>
                    </div>
                )}

                {/* Orders List */}
                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Siparişler yükleniyor...</div>
                    ) : filteredOrders.map(order => (
                        <div key={order.id} className="card" style={{ borderLeft: `4px solid ${STATUS_LABELS[order.status].color}` }}>
                            <div className="flex justify-between items-center" style={{ cursor: 'pointer' }} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                                <div className="flex items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 style={{ margin: 0 }}>{order.id}</h3>
                                            {order.revisionCount > 0 && (
                                                <span className="badge" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.7rem' }}>
                                                    {order.revisionCount}. Revizyon
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                            {order.customerName} • {order.fabricCode} • {order.mechanism} • {order.customerCity}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="badge" style={{ backgroundColor: `${STATUS_LABELS[order.status].color}20`, color: STATUS_LABELS[order.status].color, border: `1px solid ${STATUS_LABELS[order.status].color}40` }}>
                                        {STATUS_LABELS[order.status].label}
                                    </span>
                                    {expandedOrder === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="animate-fade-in" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                                    {/* Progress Steps */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '14px', left: '5%', right: '5%', height: '3px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                                        {(['PENDING', 'CUTTING', 'SEWING', 'QC', 'READY', 'DELIVERED'] as OrderStatus[]).map((step, idx) => {
                                            const allSteps: OrderStatus[] = ['PENDING', 'CUTTING', 'SEWING', 'QC', 'READY', 'DELIVERED'];
                                            const currentIdx = allSteps.indexOf(order.status);
                                            const isActive = idx <= currentIdx;
                                            const isCurrent = step === order.status;
                                            return (
                                                <div key={step} style={{ textAlign: 'center', position: 'relative', zIndex: 1, flex: 1 }}>
                                                    <div style={{
                                                        width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto',
                                                        backgroundColor: isActive ? STATUS_LABELS[step].color : 'var(--border-color)',
                                                        border: isCurrent ? `3px solid ${STATUS_LABELS[step].color}` : 'none',
                                                        boxShadow: isCurrent ? `0 0 0 4px ${STATUS_LABELS[step].color}30` : 'none',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {isActive && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                                    </div>
                                                    <span style={{ fontSize: '0.65rem', color: isCurrent ? STATUS_LABELS[step].color : 'var(--text-muted)', marginTop: '0.25rem', display: 'block', fontWeight: isCurrent ? 600 : 400 }}>
                                                        {STATUS_LABELS[step].label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                                        <div><span style={{ color: 'var(--text-muted)' }}>En × Boy:</span><br /><strong>{order.width} × {order.height} cm</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Pile Oranı:</span><br /><strong>×{order.pileRatio}</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Parça:</span><br /><strong>{order.parts} Adet</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Telefon:</span><br /><strong>{order.customerPhone}</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Sipariş Tarihi:</span><br /><strong>{order.createdAt}</strong></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Teslim Tarihi:</span><br /><strong>{order.deliveryDate}</strong></div>
                                    </div>

                                    {/* Address & Invoice */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.875rem' }}>
                                            <strong>📍 Teslimat Adresi</strong><br />
                                            <span style={{ color: 'var(--text-muted)' }}>{order.customerAddress}<br />{order.customerCity}</span>
                                        </div>
                                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', fontSize: '0.875rem' }}>
                                            <strong>🧾 Fatura</strong><br />
                                            <span style={{ color: 'var(--text-muted)' }}>{order.invoiceName}{order.invoiceTaxNo ? ` (VKN: ${order.invoiceTaxNo})` : ''}<br />{order.invoiceAddress}</span>
                                        </div>
                                    </div>

                                    {order.notes && (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '8px', fontSize: '0.875rem' }}>
                                            <strong>📝 Not:</strong> {order.notes}
                                        </div>
                                    )}
                                    {order.parentOrderId && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '0.875rem' }}>
                                            <strong>🔄 Revizyon:</strong> Orijinal Sipariş: {order.parentOrderId}
                                        </div>
                                    )}

                                    {/* Biten İş Görselleri */}
                                    {(order.status === 'READY' || order.status === 'DELIVERED' || order.status === 'IN_TRANSIT') && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <ImageUploader
                                                label="📸 Biten İş Görselleri (WebP)"
                                                entityId={order.id}
                                                existingImages={order.imageUrls}
                                                onImageSaved={(url) => handleImageUpdate(order.id, url)}
                                            />
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                                        <button onClick={() => setQrModalOrder(order)} className="button button-outline" style={{ flex: 1, fontSize: '0.8rem', gap: '0.4rem' }}>
                                            <QrCode size={16} /> QR Etiketi Bas
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* QR Print Modal */}
            {qrModalOrder && (
                <QRPrintModal
                    id={qrModalOrder.id}
                    label={`${qrModalOrder.customerName} • ${qrModalOrder.fabricCode}`}
                    subLabel={`${qrModalOrder.width}×${qrModalOrder.height}cm • ${qrModalOrder.mechanism}`}
                    onClose={() => setQrModalOrder(null)}
                />
            )}
        </div>
    );
}
