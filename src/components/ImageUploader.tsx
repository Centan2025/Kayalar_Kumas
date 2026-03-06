import { useRef, useState } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import { compressToWebP } from '../lib/media';

type Props = {
    label: string;
    onImageSaved: (webpUrl: string) => void;
    existingImages?: string[];
};

export default function ImageUploader({ label, onImageSaved, existingImages = [] }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState<string[]>(existingImages);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            console.log('Orijinal:', file.name, (file.size / 1024).toFixed(0), 'KB');

            const webpFile = await compressToWebP(file);
            console.log('WebP:', webpFile.name, (webpFile.size / 1024).toFixed(0), 'KB');

            // Local preview URL (gerçek uygulamada R2 URL döner)
            const url = URL.createObjectURL(webpFile);
            setImages(prev => [...prev, url]);
            onImageSaved(url);
        } catch (err) {
            console.error('Görsel yükleme hatası:', err);
            alert('Görsel yüklenemedi: ' + err);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>{label}</label>

            {/* Thumbnail grid */}
            {images.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {images.map((url, i) => (
                        <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={url} alt={`Görsel ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} style={{
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

            <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />

            <button onClick={() => fileRef.current?.click()} className="button button-outline" disabled={uploading}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', gap: '0.5rem' }}>
                {uploading ? (
                    <><ImageIcon size={16} className="animate-spin" /> Sıkıştırılıyor (WebP)...</>
                ) : (
                    <><Camera size={16} /> Fotoğraf Ekle (.webp)</>
                )}
            </button>
        </div>
    );
}
