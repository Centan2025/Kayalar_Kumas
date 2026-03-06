import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, CheckCircle, XCircle, QrCode, AlertTriangle } from 'lucide-react';
import OfflineSyncBadge from '../components/OfflineSyncBadge';

type PackageItem = { orderId: string; scanned: boolean; label: string };

type Shipment = {
    id: string;
    customerName: string;
    items: PackageItem[];
    isComplete: boolean;
    status: 'PACKING' | 'SHIPPED' | 'DELIVERED';
};

const MOCK_SHIPMENTS: Shipment[] = [
    {
        id: 'SHP-001', customerName: 'Ayşe Yılmaz',
        items: [
            { orderId: 'ORD-1029-A', scanned: false, label: 'Fon Perde (Sol Kanat)' },
            { orderId: 'ORD-1029-B', scanned: false, label: 'Fon Perde (Sağ Kanat)' },
        ],
        isComplete: false, status: 'PACKING'
    },
    {
        id: 'SHP-002', customerName: 'Fatma Kara',
        items: [
            { orderId: 'ORD-1051-A', scanned: false, label: 'Fon Perde' },
            { orderId: 'ORD-1051-B', scanned: false, label: 'Tül Perde' },
            { orderId: 'ORD-1051-C', scanned: false, label: 'Motor Mekanizma' },
        ],
        isComplete: false, status: 'PACKING'
    },
];

export default function Packaging() {
    const navigate = useNavigate();
    const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
    const [scanInput, setScanInput] = useState('');
    const [activeShipment, setActiveShipment] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const handleScan = (shipmentId: string) => {
        if (!scanInput.trim()) return;
        setScanError(null);

        const shipment = shipments.find(s => s.id === shipmentId);
        if (!shipment) return;

        // Eşleşen parça var mı kontrol et
        const matchingItem = shipment.items.find(item => item.orderId === scanInput.trim());

        if (!matchingItem) {
            // Yanlış QR uyarısı
            setScanError(`"${scanInput.trim()}" bu koliye ait bir parça değil! (${shipment.id} — ${shipment.customerName})`);
            setScanInput('');
            setTimeout(() => setScanError(null), 4000);
            return;
        }

        if (matchingItem.scanned) {
            setScanError(`"${scanInput.trim()}" zaten okutulmuş!`);
            setScanInput('');
            setTimeout(() => setScanError(null), 3000);
            return;
        }

        setShipments(prev => prev.map(s => {
            if (s.id !== shipmentId) return s;
            const updatedItems = s.items.map(item =>
                item.orderId === scanInput.trim() ? { ...item, scanned: true } : item
            );
            const allScanned = updatedItems.every(i => i.scanned);
            return { ...s, items: updatedItems, isComplete: allScanned };
        }));
        setScanInput('');
    };

    const handleShip = (shipmentId: string) => {
        setShipments(prev => prev.map(s =>
            s.id === shipmentId ? { ...s, status: 'SHIPPED' } : s
        ));
    };

    const handleDeliver = (shipmentId: string) => {
        setShipments(prev => prev.map(s =>
            s.id === shipmentId ? { ...s, status: 'DELIVERED' } : s
        ));
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '0.5rem' }}>Paketleme & Sevkiyat</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Her kolinin tüm parçalarını okutun. Eksik parça varsa koli etiketi basılamaz.</p>

                {/* Global scan error */}
                {scanError && (
                    <div className="animate-fade-in" style={{
                        padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem',
                        backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444',
                    }}>
                        <AlertTriangle size={22} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{scanError}</span>
                    </div>
                )}

                <div className="flex flex-col gap-6">
                    {shipments.map(shipment => (
                        <div key={shipment.id} className="card" style={{ borderLeft: shipment.status === 'DELIVERED' ? '4px solid var(--success)' : shipment.status === 'SHIPPED' ? '4px solid #f97316' : '4px solid var(--primary)' }}>
                            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <h3>{shipment.id} — {shipment.customerName}</h3>
                                    <span className="badge" style={{
                                        backgroundColor: shipment.status === 'DELIVERED' ? 'rgba(16,185,129,0.1)' : shipment.status === 'SHIPPED' ? 'rgba(249,115,22,0.1)' : 'rgba(79,70,229,0.1)',
                                        color: shipment.status === 'DELIVERED' ? 'var(--success)' : shipment.status === 'SHIPPED' ? '#f97316' : 'var(--primary)',
                                        border: '1px solid', marginTop: '0.5rem',
                                    }}>
                                        {shipment.status === 'PACKING' ? '📦 Paketleniyor' : shipment.status === 'SHIPPED' ? '🚚 Yolda' : '✅ Teslim Edildi'}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {shipment.items.filter(i => i.scanned).length} / {shipment.items.length} parça okutuldu
                                </span>
                            </div>

                            <div className="flex flex-col gap-2" style={{ marginBottom: '1.5rem' }}>
                                {shipment.items.map(item => (
                                    <div key={item.orderId} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                        backgroundColor: item.scanned ? 'rgba(16,185,129,0.05)' : 'var(--bg-color)',
                                        borderRadius: '8px', border: `1px solid ${item.scanned ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`
                                    }}>
                                        {item.scanned ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--text-muted)" />}
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>QR: {item.orderId}</span>
                                        </div>
                                        <span className="badge" style={{
                                            backgroundColor: item.scanned ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: item.scanned ? 'var(--success)' : 'var(--text-muted)',
                                        }}>
                                            {item.scanned ? 'Onaylandı' : 'Bekleniyor'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {shipment.status === 'PACKING' && (
                                <>
                                    <form onSubmit={e => { e.preventDefault(); handleScan(shipment.id); }} className="flex gap-2" style={{ marginBottom: '1rem' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <QrCode size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Parça QR kodu okut veya yaz..."
                                                value={activeShipment === shipment.id ? scanInput : ''}
                                                onFocus={() => setActiveShipment(shipment.id)}
                                                onChange={e => { setActiveShipment(shipment.id); setScanInput(e.target.value); setScanError(null); }}
                                            />
                                        </div>
                                        <button type="submit" className="button" disabled={!scanInput || activeShipment !== shipment.id}>Okut</button>
                                    </form>

                                    {shipment.isComplete ? (
                                        <button onClick={() => handleShip(shipment.id)} className="button w-full" style={{ backgroundColor: 'var(--success)' }}>
                                            <Truck size={20} /> Koli Etiketi Bas & Sevk Et
                                        </button>
                                    ) : (
                                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: '8px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--warning)' }}>
                                            ⚠️ Tüm parçalar okutulmadan koli etiketi basılamaz
                                        </div>
                                    )}
                                </>
                            )}

                            {shipment.status === 'SHIPPED' && (
                                <button onClick={() => handleDeliver(shipment.id)} className="button w-full" style={{ backgroundColor: 'var(--success)' }}>
                                    <CheckCircle size={20} /> Teslim Edildi Olarak İşaretle
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
