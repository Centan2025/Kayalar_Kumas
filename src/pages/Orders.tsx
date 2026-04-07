import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, QrCode, X, LayoutGrid, List, Search, Clock, MapPin, Phone, FileText, Users, Package } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import BackButton from '../components/BackButton';
import QRPrintModal from '../components/QRPrintModal';
import ImageUploader from '../components/ImageUploader';
import CustomDatePicker from '../components/CustomDatePicker';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';

export type OrderStatus = 'PENDING' | 'CUTTING' | 'SEWING' | 'QC' | 'READY' | 'IN_TRANSIT' | 'DELIVERED';

export const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
    PENDING: { label: 'Beklemede', color: '#6b7280' },
    CUTTING: { label: 'Kesimde', color: '#8b5cf6' },
    SEWING: { label: 'Dikimde', color: '#f59e0b' },
    QC: { label: 'Kalite Kontrol', color: '#3b82f6' },
    READY: { label: 'Hazır', color: '#10b981' },
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

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);

    // Form States
    const [f, setF] = useState({
        customerName: '', customerPhone: '', customerAddress: '', customerCity: '',
        invoiceName: '', invoiceTaxNo: '', invoiceAddress: '',
        deliveryDate: null as Date | null
    });

    const [orderItems, setOrderItems] = useState([
        { fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '1.0', parts: '1', notes: '' }
    ]);

    const addOrderItem = () => {
        setOrderItems([...orderItems, { fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '1.0', parts: '1', notes: '' }]);
    };

    const removeOrderItem = (index: number) => {
        if (orderItems.length > 1) {
            setOrderItems(orderItems.filter((_, i) => i !== index));
        }
    };

    const updateOrderItem = (index: number, field: string, value: string) => {
        const newItems = [...orderItems];
        (newItems[index] as any)[field] = value;
        setOrderItems(newItems);
    };

    const getDaysRemaining = (dateStr: string) => {
        if (!dateStr) return 0;
        const today = new Date();
        today.setHours(0,0,0,0);
        const delivery = new Date(dateStr);
        delivery.setHours(0,0,0,0);
        const diffTime = delivery.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

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
        let latestUrls: string[] = [];
        setOrders(prev => {
            const order = prev.find(o => o.id === orderId);
            if (order) {
                latestUrls = [...(order.imageUrls || []), newUrl];
            } else {
                latestUrls = [newUrl];
            }
            return prev.map(o => o.id === orderId ? { ...o, imageUrls: latestUrls } : o);
        });
        await supabase.from('orders').update({ image_urls: latestUrls }).eq('id', orderId);
    };

    const handleImageRemove = async (orderId: string, urlToRemove: string) => {
        let latestUrls: string[] = [];
        setOrders(prev => {
            const order = prev.find(o => o.id === orderId);
            if (order) latestUrls = order.imageUrls.filter(u => u !== urlToRemove);
            return prev.map(o => o.id === orderId ? { ...o, imageUrls: latestUrls } : o);
        });
        await supabase.from('orders').update({ image_urls: latestUrls }).eq('id', orderId);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const newOrders = orderItems.map((item, idx) => ({
            id: `ORD-${Date.now().toString().slice(-4)}-${idx + 1}`,
            customer_name: f.customerName,
            customer_phone: f.customerPhone,
            customer_address: f.customerAddress,
            customer_city: f.customerCity,
            invoice_name: f.invoiceName || f.customerName,
            invoice_tax_no: f.invoiceTaxNo,
            invoice_address: f.invoiceAddress || f.customerAddress,
            fabric_code: item.fabricCode,
            mechanism: item.mechanism,
            width: parseFloat(item.width),
            height: parseFloat(item.height),
            pile_ratio: parseFloat(item.pileRatio) || 1.0,
            status: 'PENDING',
            notes: item.notes,
            delivery_date: f.deliveryDate ? f.deliveryDate.toISOString().split('T')[0] : null,
            parts: parseInt(item.parts) || 1
        }));
        const { error } = await supabase.from('orders').insert(newOrders);
        if (!error) {
            await fetchOrders();
            setShowForm(false);
            setOrderItems([{ fabricCode: '', mechanism: 'Manuel', width: '', height: '', pileRatio: '1.0', parts: '1', notes: '' }]);
            setF({ customerName: '', customerPhone: '', customerAddress: '', customerCity: '', invoiceName: '', invoiceTaxNo: '', invoiceAddress: '', deliveryDate: null });
        }
        setLoading(false);
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
        let matchesDate = true;
        if (startDate || endDate) {
            const orderDate = new Date(o.createdAt);
            orderDate.setHours(0,0,0,0);
            if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); if (orderDate < s) matchesDate = false; }
            if (endDate) { const e = new Date(endDate); e.setHours(0,0,0,0); if (orderDate > e) matchesDate = false; }
        }
        const matchesSearch = !searchTerm || 
            o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.fabricCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesDate && matchesSearch;
    });

    const groupedOrders = filteredOrders.reduce((acc: any, order: Order) => {
        const dateKey = new Date(order.createdAt).toLocaleDateString();
        const groupKey = `${order.customerName}-${dateKey}`;
        if (!acc[groupKey]) {
            acc[groupKey] = {
                groupKey: groupKey, 
                id: order.id.includes('-') ? order.id.split('-').slice(0, 2).join('-') : order.id,
                customerName: order.customerName,
                customerCity: order.customerCity,
                customerPhone: order.customerPhone,
                createdAt: order.createdAt,
                deliveryDate: order.deliveryDate,
                items: [] as Order[],
                status: order.status,
            };
        }
        acc[groupKey].items.push(order);
        return acc;
    }, {});

    const orderGroups = Object.values(groupedOrders).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const allStatuses: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'CUTTING', 'SEWING', 'QC', 'READY', 'IN_TRANSIT', 'DELIVERED'];

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <BackButton path="/dashboard" />
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                {loading && <LoadingScreen fullScreen message="Siparişler yükleniyor..." />}
                <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <h2>Siparişler</h2>
                    <div className="flex gap-2">
                         <div className="flex bg-bgColor" style={{ padding: '0.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                            <button onClick={() => setViewMode('card')} style={{ padding: '0.5rem', border: 'none', backgroundColor: viewMode === 'card' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><LayoutGrid size={20} /></button>
                            <button onClick={() => setViewMode('list')} style={{ padding: '0.5rem', border: 'none', backgroundColor: viewMode === 'list' ? 'var(--card-bg)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}><List size={20} /></button>
                        </div>
                        <button onClick={() => setShowForm(!showForm)} className="button">
                            <Plus size={20} /> {showForm ? 'Kapat' : 'Yeni Kayıt'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4" style={{ marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                     <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '10px', bottom: '12px', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Müşteri, kumaş veya sipariş no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Başlangıç</label>
                        <CustomDatePicker selected={startDate} onChange={setStartDate} />
                    </div>
                    <div>
                         <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Bitiş</label>
                        <CustomDatePicker selected={endDate} onChange={setEndDate} />
                    </div>
                    {(startDate || endDate || searchTerm) && <button onClick={() => { setStartDate(null); setEndDate(null); setSearchTerm(''); }} className="button button-outline"><X size={16}/></button>}
                </div>

                <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', marginBottom: '1.5rem', padding: '0.25rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                    {allStatuses.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} style={{
                            padding: '0.5rem 0.75rem', border: 'none', borderRadius: 'var(--radius-md)',
                            backgroundColor: statusFilter === s ? 'var(--card-bg)' : 'transparent',
                            color: statusFilter === s ? (s === 'ALL' ? 'var(--primary)' : STATUS_LABELS[s as OrderStatus].color) : 'var(--text-muted)',
                            fontWeight: statusFilter === s ? 600 : 400, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>
                            {s === 'ALL' ? `Tümü (${orders.length})` : `${STATUS_LABELS[s].label} (${orders.filter(o => o.status === s).length})`}
                        </button>
                    ))}
                </div>

                {showForm && (
                     <div className="card animate-fade-in" style={{ marginBottom: '2rem', border: '2px solid var(--primary)' }}>
                        <form onSubmit={handleCreate} className="flex flex-col gap-6">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <input className="input" value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })} placeholder="Müşteri Ad Soyad" required />
                                <input className="input" value={f.customerPhone} onChange={e => setF({ ...f, customerPhone: e.target.value })} placeholder="Telefon" />
                                <CustomDatePicker selected={f.deliveryDate} onChange={d => setF({...f, deliveryDate: d})} placeholderText="Teslim Tarihi" required />
                            </div>
                            {orderItems.map((item, idx) => (
                                <div key={idx} className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                                    <div className="flex justify-between" style={{ marginBottom: '1rem' }}><strong>KALEM #{idx + 1}</strong> {orderItems.length > 1 && <button type="button" onClick={() => removeOrderItem(idx)}>Kaldır</button>}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                        <input className="input" value={item.fabricCode} onChange={e => updateOrderItem(idx, 'fabricCode', e.target.value)} placeholder="Kumaş Kodu" required />
                                        <input type="number" className="input" value={item.width} onChange={e => updateOrderItem(idx, 'width', e.target.value)} placeholder="En (cm)" required />
                                        <input type="number" className="input" value={item.height} onChange={e => updateOrderItem(idx, 'height', e.target.value)} placeholder="Boy (cm)" required />
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={addOrderItem} className="button button-outline">+ Kalem Ekle</button>
                            <button type="submit" className="button" disabled={loading}>Kaydet</button>
                        </form>
                     </div>
                )}

                {viewMode === 'card' ? (
                    <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        {orderGroups.map((group: any) => {
                            const daysLeft = getDaysRemaining(group.deliveryDate);
                            const urgencyColor = daysLeft < 0 ? 'var(--danger)' : daysLeft <= 3 ? 'var(--warning)' : 'var(--success)';
                            return (
                                <div key={group.groupKey} className="card" style={{ borderTop: `6px solid ${STATUS_LABELS[group.status as OrderStatus].color}`, display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                                    <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0 }}>{group.customerName}</h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{group.id} • {group.items.length} Kalem</span>
                                        </div>
                                        <span className="badge" style={{ color: STATUS_LABELS[group.status as OrderStatus].color, border: `1px solid ${STATUS_LABELS[group.status as OrderStatus].color}` }}>{STATUS_LABELS[group.status as OrderStatus].label}</span>
                                    </div>

                                    <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                        {group.items.slice(0, 2).map((it: any, i: number) => (
                                            <div key={i} style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {it.fabricCode} <span style={{ color: 'var(--text-muted)' }}>({it.width}x{it.height})</span>
                                            </div>
                                        ))}
                                        {group.items.length > 2 && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>+{group.items.length - 2} kalem daha...</div>}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div style={{ color: urgencyColor, fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Clock size={14} /> {daysLeft < 0 ? 'Gecikti!' : `${daysLeft} gün kaldı`}
                                        </div>
                                        <button onClick={() => setSelectedGroup(group)} className="button" style={{ padding: '0.5rem 1rem' }}>Yönet</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                                    <th style={{ padding: '1rem' }}>Sipariş No</th>
                                    <th style={{ padding: '1rem' }}>Müşteri</th>
                                    <th style={{ padding: '1rem' }}>Kalem</th>
                                    <th style={{ padding: '1rem' }}>Durum</th>
                                    <th style={{ padding: '1rem' }}>Termin</th>
                                    <th style={{ padding: '1rem' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderGroups.map((group: any) => {
                                    const daysLeft = getDaysRemaining(group.deliveryDate);
                                    return (
                                        <tr key={group.groupKey} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}><strong>{group.id}</strong></td>
                                            <td style={{ padding: '1rem' }}>{group.customerName}</td>
                                            <td style={{ padding: '1rem' }}>{group.items.length}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ color: STATUS_LABELS[group.status as OrderStatus].color, fontWeight: 600 }}>{STATUS_LABELS[group.status as OrderStatus].label}</span>
                                            </td>
                                            <td style={{ padding: '1rem', color: daysLeft < 0 ? 'var(--danger)' : 'inherit' }}>
                                                {daysLeft < 0 ? 'Gecikti' : `${daysLeft} gün`}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <button onClick={() => setSelectedGroup(group)} className="button button-outline" style={{ padding: '0.25rem 0.75rem' }}>Detay</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Focused Modal - Redesigned to show ALL info */}
            {selectedGroup && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-color)', zIndex: 1000, overflowY: 'auto' }}>
                    <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 2rem', borderBottom: '2px solid var(--primary)' }}>
                        <div className="flex justify-between items-center w-full">
                            <button onClick={() => setSelectedGroup(null)} className="button button-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowLeft size={18} /> Geri</button>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, color: 'var(--primary)' }}>{selectedGroup.customerName}</h2>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedGroup.id} • {selectedGroup.items.length} Kalem</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-6 flex-wrap" style={{ fontSize: '0.85rem', padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '12px', width: '100%' }}>
                            <div className="flex items-center gap-2"><Phone size={14} color="var(--text-muted)" /> <strong>{selectedGroup.customerPhone || '-'}</strong></div>
                            <div className="flex items-center gap-2"><MapPin size={14} color="var(--text-muted)" /> <strong>{selectedGroup.customerCity || '-'}</strong></div>
                            <div className="flex items-center gap-2"><FileText size={14} color="var(--primary)" /> Kayıt: <strong>{new Date(selectedGroup.createdAt).toLocaleDateString('tr-TR')}</strong></div>
                            <div className="flex items-center gap-2"><Clock size={14} color="var(--danger)" /> Termin: <strong>{new Date(selectedGroup.deliveryDate).toLocaleDateString('tr-TR')}</strong></div>
                            <div className="flex items-center gap-2"><Users size={14} color="var(--primary)" /> Müşteri: <strong>{selectedGroup.customerName}</strong></div>
                        </div>
                    </header>
                    
                    <main className="container animate-fade-in" style={{ padding: '1.5rem 1rem' }}>

                        {selectedGroup.items.map((item: Order) => (
                            <div key={item.id} className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                                <div className="flex justify-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                    <div className="flex items-center gap-3">
                                        <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}><Package size={24} color="var(--primary)" /></div>
                                        <div><h2 style={{ margin: 0, fontSize: '1.4rem' }}>{item.fabricCode}</h2><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kalem No: {item.id}</span></div>
                                    </div>
                                    <span className="badge" style={{ backgroundColor: `${STATUS_LABELS[item.status].color}20`, color: STATUS_LABELS[item.status].color, padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: 700 }}>{STATUS_LABELS[item.status].label}</span>
                                </div>
                                <OrderDetailsView order={item} setQrModalOrder={setQrModalOrder} handleImageUpdate={handleImageUpdate} handleImageRemove={handleImageRemove} />
                            </div>
                        ))}
                    </main>
                </div>
            )}

            {qrModalOrder && <QRPrintModal id={qrModalOrder.id} label={qrModalOrder.customerName} subLabel={qrModalOrder.fabricCode} parts={qrModalOrder.parts} onClose={() => setQrModalOrder(null)} />}
        </div>
    );
}

function OrderDetailsView({ order, setQrModalOrder, handleImageUpdate, handleImageRemove }: { order: Order, setQrModalOrder: any, handleImageUpdate: any, handleImageRemove: any }) {
    const steps: OrderStatus[] = ['PENDING', 'CUTTING', 'SEWING', 'QC', 'READY', 'DELIVERED'];
    const currentIdx = steps.indexOf(order.status);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Progress Bar - RESTORED & ENHANCED */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Üretim Aşaması</span>
                    <span style={{ fontSize: '0.85rem', color: STATUS_LABELS[order.status].color, fontWeight: 700 }}>{Math.round(((currentIdx + 1) / steps.length) * 100)}% Tamamlandı</span>
                </div>
                <div style={{ height: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '10px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ flex: 1, backgroundColor: i <= currentIdx ? STATUS_LABELS[s].color : 'rgba(0,0,0,0.05)', transition: 'all 0.3s' }} />
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ fontSize: '0.65rem', color: i <= currentIdx ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: i === currentIdx ? 800 : 400, flex: 1, textAlign: 'center' }}>
                            {STATUS_LABELS[s].label}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '12px' }}>
                <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ölçü (En x Boy)</label><br/><strong>{order.width}cm × {order.height}cm</strong></div>
                <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mekanizma</label><br/><strong>{order.mechanism}</strong></div>
                <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pile Oranı</label><br/><strong>×{order.pileRatio}</strong></div>
                <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parça Sayısı</label><br/><strong>{order.parts} Adet</strong></div>
            </div>

            {order.notes && (
                <div className="flex gap-4" style={{ 
                    padding: '1.5rem', 
                    backgroundColor: 'rgba(245, 158, 11, 0.08)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderLeft: '6px solid var(--warning)',
                    marginTop: '1rem'
                }}>
                    <FileText size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                        <div style={{ fontWeight: 800, color: 'var(--warning)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                            <FileText size={16} /> ÖNEMLİ SİPARİŞ NOTU (ÜRETİM TALİMATI)
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontWeight: 500 }}>
                            {order.notes}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                 <ImageUploader label="Üretim Görselleri" entityId={order.id} existingImages={order.imageUrls} onImageSaved={(url) => handleImageUpdate(order.id, url)} onImageRemoved={(url) => handleImageRemove(order.id, url)} />
            </div>

            <button onClick={() => setQrModalOrder(order)} className="button button-outline" style={{ width: '100%', gap: '0.5rem', justifyContent: 'center' }}><QrCode size={18}/> QR Etiketi Yazdır</button>
        </div>
    );
}
