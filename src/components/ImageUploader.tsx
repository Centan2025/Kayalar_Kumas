import { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { compressToWebP, uploadToR2 } from '../lib/media';

type Props = {
    label: string;
    entityId: string;
    onImageSaved: (webpUrl: string) => void;
    onImageRemoved?: (url: string) => void;
    existingImages?: string[];
    maxImages?: number;
};

export default function ImageUploader({ label, entityId, onImageSaved, onImageRemoved, existingImages = [], maxImages }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState<string[]>(existingImages);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    useEffect(() => {
        setImages(existingImages);
    }, [existingImages]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        try {
            const file = e.target.files[0];

            // 1. Sıkıştır
            const webpFile = await compressToWebP(file);

            // 2. R2'ye Yükle
            const publicUrl = await uploadToR2(webpFile, entityId);

            // 3. Başarılı ise arayüzü ve üst bileşeni güncelle
            if (maxImages === 1) {
                setImages([publicUrl]);
            } else {
                setImages(prev => [...prev, publicUrl]);
            }
            onImageSaved(publicUrl);
        } catch (err) {
            console.error('Görsel yükleme hatası:', err);
            alert('Görsel yüklenemedi: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const navigateImage = (direction: 'prev' | 'next', e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (selectedImageIndex === null) return;

        if (direction === 'prev') {
            setSelectedImageIndex(prev => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
        } else {
            setSelectedImageIndex(prev => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
        }
    };

    return (
        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>{label}</label>

            {/* Thumbnail grid */}
            {images.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {images.map((url, i) => (
                        <div key={i} style={{ 
                            position: 'relative', 
                            width: maxImages === 1 ? '240px' : '72px', 
                            height: maxImages === 1 ? '240px' : '72px', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            border: '1.5px solid var(--primary)', 
                            boxShadow: 'var(--shadow-md)',
                            cursor: 'pointer' 
                        }}>
                            <img 
                                src={url} 
                                alt={`Görsel ${i + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onClick={() => setSelectedImageIndex(i)}
                            />
                            <button type="button" onClick={(e) => { 
                                e.stopPropagation(); 
                                const urlToRemove = url;
                                setImages(prev => prev.filter((_, idx) => idx !== i)); 
                                if (onImageRemoved) onImageRemoved(urlToRemove);
                            }} style={{
                                position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                            }}>
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && maxImages === 1 && (
                <div 
                    onClick={() => fileRef.current?.click()}
                    style={{ 
                        width: '240px', height: '240px', borderRadius: '12px', border: '2px dashed var(--border-color)', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        gap: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1rem',
                        transition: 'all 0.2s ease', backgroundColor: 'rgba(255,255,255,0.02)'
                    }}
                >
                    <Camera size={32} />
                    <span style={{ fontSize: '0.75rem' }}>Fotoğraf Seç</span>
                </div>
            )}

            <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />

            <button type="button" onClick={() => fileRef.current?.click()} className="button button-outline" disabled={uploading}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', gap: '0.5rem' }}>
                {uploading ? (
                    <><Loader2 size={16} className="animate-spin" /> Yükleniyor...</>
                ) : (
                    <><Camera size={16} /> {images.length > 0 && maxImages === 1 ? 'Fotoğrafı Değiştir' : 'Fotoğraf Ekle (.webp)'}</>
                )}
            </button>

            {/* Fullscreen Preview Modal */}
            {selectedImageIndex !== null && (
                <div 
                    onClick={() => setSelectedImageIndex(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2147483647, cursor: 'zoom-out', padding: '2rem'
                    }}
                >
                    {/* Close Button */}
                    <button 
                        style={{ 
                            position: 'absolute', top: '1.5rem', right: '1.5rem', 
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                            color: 'white', cursor: 'pointer', width: '44px', height: '44px', 
                            borderRadius: '50%', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', transition: 'all 0.2s ease', zIndex: 10
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(null); }}
                    >
                        <X size={24} />
                    </button>

                    {/* Navigation Buttons */}
                    {images.length > 1 && (
                        <>
                            <button 
                                onClick={(e) => navigateImage('prev', e)}
                                style={{
                                    position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                                    width: '56px', height: '56px', borderRadius: '50%', cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                                }}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                onClick={(e) => navigateImage('next', e)}
                                style={{
                                    position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)',
                                    background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                                    width: '56px', height: '56px', borderRadius: '50%', cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                                }}
                            >
                                <ChevronRight size={32} />
                            </button>
                            
                            {/* Image Counter */}
                            <div style={{
                                position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                                color: 'white', background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem',
                                borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {selectedImageIndex + 1} / {images.length}
                            </div>
                        </>
                    )}

                    <img 
                        src={images[selectedImageIndex]} 
                        alt="Büyük Görünüm" 
                        style={{ 
                            maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', 
                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', 
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
                            transform: 'scale(1)', transition: 'all 0.3s ease'
                        }} 
                    />
                </div>
            )}
        </div>
    );
}
