import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, QrCode, CheckCircle, Database, AlertTriangle, Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import { supabase } from '../lib/supabase';
import { type Order, type OrderStatus } from './Orders';

const STATION_RULES: Record<string, { acceptStatus: OrderStatus; nextStatus: OrderStatus; label: string; requiredRole: string }> = {
    cut: { acceptStatus: 'PENDING', nextStatus: 'CUTTING', label: 'Kesim İstasyonu', requiredRole: 'CUTTER' },
    sew: { acceptStatus: 'CUTTING', nextStatus: 'SEWING', label: 'Dikim İstasyonu', requiredRole: 'TAILOR' },
};

export default function Scanner() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [searchParams] = useSearchParams();
    const stationId = searchParams.get('station') || 'unknown';
    const stationRule = STATION_RULES[stationId];

    // Yetki Kontrolü
    useEffect(() => {
        if (profile && stationRule) {
            const hasAccess = profile.roles.includes('ADMIN') || profile.roles.includes(stationRule.requiredRole);
            if (!hasAccess) {
                alert(`Bu istasyonda (${stationRule.label}) işlem yapma yetkiniz bulunmuyor.`);
                navigate('/dashboard');
            }
        }
    }, [profile, stationRule, navigate]);

    const [scannedId, setScannedId] = useState('');
    const [scanningStatus, setScanningStatus] = useState<'idle' | 'success' | 'error' | 'wrong_station'>('idle');
    const [foundOrder, setFoundOrder] = useState<Order | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Camera QR scanner state
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = 'qr-reader';
    const processingRef = useRef(false);

    const startCamera = async () => {
        setCameraError(null);
        try {
            const scanner = new Html5Qrcode(scannerContainerId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' }, // Arka kamera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // QR algılandığında
                    if (!processingRef.current) {
                        processingRef.current = true;
                        setScannedId(decodedText);
                        // Kamerayı durdur ve işlemi başlat
                        if (scannerRef.current) {
                            scannerRef.current.stop().then(() => {
                                // Important: We don't remove scannerRef.current here, only after stop is successful if needed.
                                // Actually, HTML5Qrcode.stop() is what we want.
                                setCameraActive(false);
                                processScannedId(decodedText);
                                setTimeout(() => { processingRef.current = false; }, 1000);
                            }).catch(err => {
                                console.warn("Scanner stop error:", err);
                                setCameraActive(false);
                                processingRef.current = false;
                            });
                        }
                    }
                },
                () => { /* QR bulunamadı — sessiz */ }
            );

            setCameraActive(true);
        } catch (err: any) {
            console.error('Kamera başlatma hatası:', err);
            if (err?.toString?.().includes('NotAllowedError')) {
                setCameraError('Kamera izni reddedildi. Tarayıcı ayarlarından kamera iznini açın.');
            } else if (err?.toString?.().includes('NotFoundError')) {
                setCameraError('Cihazda kamera bulunamadı.');
            } else {
                setCameraError('Kamera başlatılamadı: ' + (err?.message || err));
            }
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (e) { /* zaten durdurulmuş */ }
            scannerRef.current = null;
        }
        setCameraActive(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const processScannedId = async (id: string) => {
        const trimmedId = id.trim();
        if (!trimmedId) return;

        // Check if a personnel QR is scanned instead of an order QR
        if (trimmedId.startsWith('qr_auth_')) {
            setErrorMsg("HATA: Personel kartı okutuldu! Lütfen işlem yapmak için sipariş (ürün) QR kodunu okutunuz.");
            setScanningStatus('error');
            setFoundOrder(null);
            setTimeout(() => setScanningStatus('idle'), 5000);
            return;
        }

        try {
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', trimmedId)
                .single();

            if (fetchError || !order) {
                setErrorMsg(`"${trimmedId}" ID'li sipariş bulunamadı!`);
                setScanningStatus('error');
                setFoundOrder(null);
                setTimeout(() => setScanningStatus('idle'), 3000);
                return;
            }

            // Map DB snake_case fields to camelCase as expected by the UI Order type
            const mappedOrder: Order = {
                id: order.id,
                customerName: order.customer_name,
                customerPhone: order.customer_phone,
                customerAddress: order.customer_address,
                customerCity: order.customer_city,
                invoiceName: order.invoice_name,
                invoiceTaxNo: order.invoice_tax_no,
                invoiceAddress: order.invoice_address,
                fabricCode: order.fabric_code,
                mechanism: order.mechanism,
                width: order.width,
                height: order.height,
                pileRatio: order.pile_ratio,
                status: order.status,
                notes: order.notes,
                createdAt: order.created_at,
                deliveryDate: order.delivery_date,
                revisionCount: order.revision_count,
                parentOrderId: order.parent_order_id,
                parts: order.parts,
                imageUrls: order.image_urls || []
            };

            if (stationRule && mappedOrder.status !== stationRule.acceptStatus) {
                const statusLabels: Record<string, string> = {
                    PENDING: 'Beklemede', CUTTING: 'Kesimde', SEWING: 'Dikimde',
                    QC: 'Kalite Kontrolde', READY: 'Hazır', IN_TRANSIT: 'Yolda', DELIVERED: 'Teslim Edildi'
                };
                setErrorMsg(`Bu sipariş şu an "${statusLabels[mappedOrder.status]}" durumunda. ${stationRule.label} için "${statusLabels[stationRule.acceptStatus]}" durumunda olmalı!`);
                setScanningStatus('wrong_station');
                setFoundOrder(mappedOrder);
                setTimeout(() => setScanningStatus('idle'), 5000);
                return;
            }

            setFoundOrder(mappedOrder);

            try {
                const isOnline = navigator.onLine;
                const actionData = {
                    order_id: trimmedId,
                    station_id: `station_${stationId}`,
                    user_id: user?.id || 'unknown_user',
                    action_type: 'COMPLETED' as const,
                    created_at: new Date().toISOString(),
                    synced: false
                };

                if (isOnline) {
                    // Update Supabase directly if online
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ status: stationRule.nextStatus })
                        .eq('id', trimmedId);

                    if (updateError) throw updateError;

                    await new Promise(res => setTimeout(res, 500));
                    actionData.synced = true;
                }

                await db.offlineQueue.add(actionData);
                setScanningStatus('success');
                setScannedId('');
                setTimeout(() => setScanningStatus('idle'), 4000);
            } catch (err) {
                console.error(err);
                setScanningStatus('error');
                setErrorMsg('Durum güncellenemedi: ' + (err as any).message);
            }
        } catch (err) {
            console.error(err);
            setScanningStatus('error');
            setErrorMsg('Sipariş yüklenirken hata oluştu: ' + (err as any).message);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await processScannedId(scannedId);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#000', color: 'white' }}>
            <header className="app-header" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '1px solid #333' }}>
                <button onClick={() => { stopCamera(); navigate('/dashboard'); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

                <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                    {stationRule?.label || 'İstasyon'} QR Okuyucu
                </h2>
                <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Kamerayı açarak QR kodu okutun veya manuel giriş yapın.
                </p>

                {/* Camera QR Scanner Area */}
                <div style={{ width: '100%', maxWidth: '340px', marginBottom: '1.5rem' }}>
                    <div style={{
                        display: !cameraActive ? 'flex' : 'none',
                        width: '100%', aspectRatio: '1', border: '2px dashed var(--primary)', borderRadius: '24px',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'rgba(79,70,229,0.1)', position: 'relative', overflow: 'hidden'
                    }}>
                        {scanningStatus === 'success' ? (
                            <CheckCircle size={64} color="var(--success)" className="animate-fade-in" />
                        ) : scanningStatus === 'error' || scanningStatus === 'wrong_station' ? (
                            <AlertTriangle size={64} color={scanningStatus === 'wrong_station' ? '#f59e0b' : '#ef4444'} className="animate-fade-in" />
                        ) : (
                            <>
                                <QrCode size={48} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                <button onClick={startCamera} className="button" style={{ gap: '0.5rem' }}>
                                    <Camera size={20} /> Kamerayı Aç
                                </button>
                            </>
                        )}

                        {scanningStatus === 'idle' && !cameraActive && (
                            <div style={{
                                position: 'absolute', top: '10%', left: '10%', right: '10%', height: '2px',
                                backgroundColor: 'var(--primary)', boxShadow: '0 0 10px var(--primary)',
                                animation: 'scan 2.5s infinite linear'
                            }} />
                        )}
                    </div>

                    <div style={{ position: 'relative', display: cameraActive ? 'block' : 'none' }}>
                        <div id={scannerContainerId} style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}></div>
                        <button onClick={stopCamera} style={{
                            position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10,
                            backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
                            padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem'
                        }}>
                            <CameraOff size={16} /> Kapat
                        </button>
                    </div>
                </div>

                {/* Camera Error */}
                {cameraError && (
                    <div className="animate-fade-in" style={{
                        padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', width: '100%', maxWidth: '340px',
                        backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: '0.85rem', textAlign: 'center'
                    }}>
                        📷 {cameraError}
                    </div>
                )}

                {/* Error / Warning Messages */}
                {(scanningStatus === 'error' || scanningStatus === 'wrong_station') && (
                    <div className="animate-fade-in" style={{
                        padding: '1rem', borderRadius: '12px', marginBottom: '1rem', width: '100%', maxWidth: '340px', textAlign: 'center',
                        backgroundColor: scanningStatus === 'wrong_station' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        border: `1px solid ${scanningStatus === 'wrong_station' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: scanningStatus === 'wrong_station' ? '#f59e0b' : '#ef4444',
                    }}>
                        <strong>{scanningStatus === 'wrong_station' ? '⚠️ Sıra Hatası!' : '❌ Hata!'}</strong><br />
                        <span style={{ fontSize: '0.85rem' }}>{errorMsg}</span>
                    </div>
                )}

                {/* Success + Order Details */}
                {scanningStatus === 'success' && foundOrder && (
                    <div className="animate-fade-in" style={{
                        padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem', width: '100%', maxWidth: '340px',
                        backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#10b981' }}>
                            <CheckCircle size={20} /> <strong>İşlem Başarılı</strong>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
                            <div><span style={{ color: '#6b7280' }}>Sipariş:</span> <strong>{foundOrder.id}</strong></div>
                            <div><span style={{ color: '#6b7280' }}>Müşteri:</span> <strong>{foundOrder.customerName}</strong></div>
                            <div><span style={{ color: '#6b7280' }}>Ölçü:</span> <strong>{foundOrder.width}×{foundOrder.height}cm</strong></div>
                            <div><span style={{ color: '#6b7280' }}>Pile:</span> <strong>×{foundOrder.pileRatio}</strong></div>
                            <div><span style={{ color: '#6b7280' }}>Kumaş:</span> <strong>{foundOrder.fabricCode}</strong></div>
                            <div><span style={{ color: '#6b7280' }}>Mekanizma:</span> <strong>{foundOrder.mechanism}</strong></div>
                        </div>
                        {foundOrder.notes && (
                            <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                📝 <strong>Not:</strong> {foundOrder.notes}
                            </div>
                        )}
                    </div>
                )}

                {/* Manuel giriş */}
                <div style={{ width: '100%', maxWidth: '340px' }}>
                    <p style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center', marginBottom: '0.5rem' }}>veya manuel giriş:</p>
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text" placeholder="Sipariş No: ORD-1051"
                            value={scannedId} onChange={(e) => setScannedId(e.target.value)}
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white', fontSize: '0.9rem' }}
                        />
                        <button type="submit" className="button" disabled={!scannedId}>
                            <Database size={18} /> Oku
                        </button>
                    </form>
                </div>

                <style>{`
          @keyframes scan { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
          #qr-reader video { 
              border-radius: 16px !important; 
              width: 100% !important;
              height: auto !important;
              object-fit: cover !important;
          }
          #qr-reader img { display: none !important; }
          #qr-reader__scan_region { border-radius: 16px !important; }
          #qr-reader__dashboard { display: none !important; }
        `}</style>
            </main>
        </div>
    );
}
