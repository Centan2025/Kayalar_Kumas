import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

/**
 * Compresses an image to WebP format.
 * @param file The original image file
 * @returns Compressed WebP File
 */
export async function compressToWebP(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.8
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_" + Date.now() + ".webp";
        return new File([compressedBlob], safeName, { type: 'image/webp' });
    } catch (error) {
        console.error('Error compressing image:', error);
        throw error;
    }
}

/**
 * Uploads a WebP file to Supabase Storage.
 * Falls back from R2 due to CORS issues in local development.
 * @param file The WebP file to upload
 * @param entityId Order ID or Material ID for path prefixing
 * @returns The final public URL of the uploaded image
 */
export async function uploadToR2(file: File, entityId: string): Promise<string> {
    try {
        const storagePath = `qc-photos/${entityId}/${file.name}`;

        const { data, error } = await supabase.storage
            .from('media')
            .upload(storagePath, file, {
                contentType: 'image/webp',
                upsert: true
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            throw new Error(`Fotoğraf yükleme hatası: ${error.message}`);
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(data.path);

        console.log('✅ Fotoğraf başarıyla yüklendi:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading photo:', error);
        throw error;
    }
}
