import imageCompression from 'browser-image-compression';

/**
 * Compresses an image to WebP format.
 * @param file The original image file
 * @returns Compressed WebP File
 */
export async function compressToWebP(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.8
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        // Convert Blob back to File with .webp extension
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        return new File([compressedBlob], newFileName, { type: 'image/webp' });
    } catch (error) {
        console.error('Error compressing image:', error);
        throw error;
    }
}

/**
 * Uploads a WebP file to Cloudflare R2 using a pre-signed URL (mocked).
 * @param file The WebP file to upload
 * @param orderId Optional Order ID for tracking
 * @returns The final public URL of the uploaded image
 */
export async function uploadToR2(file: File, orderId: string): Promise<string> {
    try {
        // 1. In a real app, first fetch the pre-signed URL from Supabase Edge Functions or your backend
        // const { url, path } = await getPresignedUrlFromBackend(file.name);

        // 2. Upload to the pre-signed URL using PUT
        // await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

        // For this demonstration, we'll return a mock URL
        console.log(`[R2 MOCK UPLOAD] Mock uploading ${file.name} for Order ID ${orderId}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockUrl = `https://cdn.curtaintracker.mock/qc-photos/${orderId}-${Date.now()}.webp`;
        return mockUrl;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
}
