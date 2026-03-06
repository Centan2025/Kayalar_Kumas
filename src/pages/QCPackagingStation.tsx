import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, CheckCircle, Upload, XCircle, AlertCircle, RotateCcw, QrCode as QrIcon, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import OfflineSyncBadge from '../components/OfflineSyncBadge';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { compressToWebP, uploadToR2 } from '../lib/media';
import { supabase } from '../lib/supabase';
import { type Order } from './Orders';

export default function QCPackagingStation() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [orderId, setOrderId] = useState('');
    const [qcStatus, setQcStatus] = useState<'idle' | 'success' | 'rejected'>('idle');
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [foundOrder, setFoundOrder] = useState<Order | null>(null);
    const [revisionId, setRevisionId] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const lookupOrder = async (id: string) => {
        const trimmedId = id.trim();
        if (!trimmedId) {
            setFoundOrder(null);
            return;
        }

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', trimmedId)
            .single();

        if (error || !data) {
            setFoundOrder(null);
        } else {
            setFoundOrder({
                ...data,
                customerName: data.customer_name,
                fabricCode: data.fabric_code
            } as any);
        }
    };

    const startScanner = async () => {
        setQcStatus('idle');
        setOrderId('');
        setFoundOrder(null);
        setShowScanner(true);

        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qc-qr-reader");
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setOrderId(decodedText);
                        lookupOrder(decodedText);
                        stopScanner();
                    },
                    () => { }
                );
            } catch (err) {
                console.error("Scanner error:", err);
                setShowScanner(false);
            }
        }, 100);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (e) { }
            scannerRef.current = null;
        }
        setShowScanner(false);
    };

    const handleCaptureClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!orderId) {
            alert("Lütfen önce Kumaş/Sipariş QR ID'sini girin!");
            return;
        }

        const file = e.target.files[0];
        setUploading(true);

        try {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);

            console.log('Original File:', file.name, file.size / 1024, 'KB');
            const webpFile = await compressToWebP(file);
            console.log('Compressed WebP File:', webpFile.name, webpFile.size / 1024, 'KB');

            const uploadedUrl = await uploadToR2(webpFile, orderId);

            const actionData = {
                order_id: orderId,
                station_id: 'station_qc',
                user_id: user?.id || 'unknown_user',
                action_type: 'PHOTO_UPLOADED' as const,
                photo_url: uploadedUrl,
                created_at: new Date().toISOString(),
                synced: false
            };

            // 2.5 Supabase durum güncellemesi
            if (navigator.onLine) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ status: 'READY' })
                    .eq('id', orderId);

                if (updateError) throw updateError;
                actionData.synced = true;
            }

            await db.offlineQueue.add(actionData);
            setQcStatus('success');
        } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            alert('Fotoğraf yüklenemedi. ' + error);
        } finally {
            setUploading(false);
        }
    };

    const handleReject = async () => {
        if (!orderId) return;

        // 1. REJECTED log'u at
        const actionData = {
            order_id: orderId,
            station_id: 'station_qc',
            user_id: user?.id || 'unknown_user',
            action_type: 'REJECTED' as const,
            created_at: new Date().toISOString(),
            synced: navigator.onLine
        };
        await db.offlineQueue.add(actionData);

        // 2. Otomatik revizyon siparişi oluştur
        const newRevId = `${orderId}-REV${Date.now().toString().slice(-3)}`;
        setRevisionId(newRevId);

        // 3. Revizyon log'u da at (gerçek DB'de INSERT olacak)
        const revisionAction = {
            order_id: newRevId,
            station_id: 'station_qc',
            user_id: user?.id || 'unknown_user',
            action_type: 'REVISION_CREATED' as const,
            created_at: new Date().toISOString(),
            synced: navigator.onLine
        };
        await db.offlineQueue.add(revisionAction);

        setQcStatus('rejected');
    };

    const resetForm = () => {
        setOrderId('');
        setQcStatus('idle');
        setPreviewUrl(null);
        setFoundOrder(null);
        setRevisionId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div>
            <header className="app-header">
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={20} /> Geri
                </button>
                <OfflineSyncBadge />
            </header>

            <main className="container animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2>Kalite Kontrol İstasyonu</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Sipariş QR ID'sini okutun (veya yazın) ve kontrol sonrası fotoğraf çekin.
                    </p>
                </div>

                <div className="card flex flex-col gap-6">
                    <div className="flex gap-2">
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Sipariş / Kumaş ID</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text" className="input" value={orderId}
                                    onChange={(e) => { setOrderId(e.target.value); lookupOrder(e.target.value); }}
                                    placeholder="ID girin veya okutun..."
                                    disabled={uploading || qcStatus !== 'idle'}
                                />
                            </div>
                        </div>
                        <button
                            onClick={showScanner ? stopScanner : startScanner}
                            className={`button ${showScanner ? 'button-outline' : ''}`}
                            style={{ alignSelf: 'flex-end', height: '42px', padding: '0 1rem' }}
                            disabled={uploading || qcStatus !== 'idle'}
                        >
                            {showScanner ? <CameraOff size={20} /> : <QrIcon size={20} />}
                        </button>
                    </div>

                    {showScanner && (
                        <div className="animate-fade-in" style={{ position: 'relative' }}>
                            <div id="qc-qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--primary)', backgroundColor: '#000' }}></div>
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Sipariş QR kodunu kameraya gösterin.
                            </p>
                        </div>
                    )}

                    {/* Sipariş Detay Kartı */}
                    {foundOrder && qcStatus === 'idle' && (
                        <div className="animate-fade-in" style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>Müşteri:</span> <strong>{foundOrder.customerName}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Kumaş:</span> <strong>{foundOrder.fabricCode}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Ölçü:</span> <strong>{foundOrder.width}×{foundOrder.height}cm</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Mekanizma:</span> <strong>{foundOrder.mechanism}</strong></div>
                            </div>
                            {foundOrder.notes && (
                                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--warning)' }}>📝 {foundOrder.notes}</p>
                            )}
                        </div>
                    )}

                    {qcStatus === 'idle' && (
                        <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                            <button onClick={handleReject} className="button button-outline"
                                style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={!orderId || uploading}>
                                <AlertCircle size={20} /> Defolu / Revizyon
                            </button>
                            <button onClick={handleCaptureClick} className="button"
                                style={{ flex: 2, backgroundColor: 'var(--success)' }} disabled={!orderId || uploading}>
                                {uploading ? <Upload size={20} className="animate-spin" /> : <Camera size={20} />}
                                {uploading ? 'Yükleniyor...' : 'Fotoğrafla ve Onayla'}
                            </button>
                        </div>
                    )}

                    {previewUrl && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>QC Görüntüsü (.webp)</p>
                            <img src={previewUrl} alt="QC Preview" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                        </div>
                    )}

                    {qcStatus === 'success' && (
                        <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'var(--success)', textAlign: 'center' }}>
                            <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ color: 'var(--success)' }}>Onaylandı ve Kaydedildi</h3>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>Görsel R2'ye yüklendi ve QR süreci tamamlandı.</p>
                            <button onClick={resetForm} className="button" style={{ marginTop: '1.5rem', width: '100%' }}>Sonraki Ürüne Geç</button>
                        </div>
                    )}

                    {qcStatus === 'rejected' && (
                        <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'var(--danger)', textAlign: 'center' }}>
                            <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem auto' }} />
                            <h3 style={{ color: 'var(--danger)' }}>Revizyona Gönderildi</h3>
                            <p style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                Bu sipariş için yeni revizyon iş emri oluşturuldu.
                            </p>
                            {revisionId && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <RotateCcw size={16} color="var(--danger)" />
                                        <span>Yeni Revizyon ID: <strong>{revisionId}</strong></span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Orijinal: {orderId} → Kesim istasyonuna geri yönlendirildi
                                    </p>
                                </div>
                            )}
                            <button onClick={resetForm} className="button" style={{ marginTop: '1.5rem', width: '100%' }}>Sonraki Ürüne Geç</button>
                        </div>
                    )}
                </div>
            </main>
            <style>{`
                #qc-qr-reader video {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: cover !important;
                }
                #qc-qr-reader img { display: none !important; }
            `}</style>
        </div>
    );
}
