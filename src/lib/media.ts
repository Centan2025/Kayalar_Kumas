import imageCompression from 'browser-image-compression';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: import.meta.env.VITE_R2_ENDPOINT,
    credentials: {
        accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
    }
});

/**
 * Compresses an image to WebP format.
 * @param file The original image file
 * @returns Compressed WebP File
 */
export async function compressToWebP(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280, // Optimized for mobile/web
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.8
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        // Convert Blob back to File with .webp extension and safe name
        const safeName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase() + "_" + Date.now() + ".webp";
        return new File([compressedBlob], safeName, { type: 'image/webp' });
    } catch (error) {
        console.error('Error compressing image:', error);
        throw error;
    }
}

/**
 * Uploads a WebP file to Cloudflare R2.
 * @param file The WebP file to upload
 * @param entityId Order ID or Material ID for path prefixing
 * @returns The final public URL of the uploaded image
 */
export async function uploadToR2(file: File, entityId: string): Promise<string> {
    try {
        const bucket = import.meta.env.VITE_R2_BUCKET_NAME;
        const publicBaseUrl = import.meta.env.VITE_R2_PUBLIC_URL;

        // Path logic: qc-photos/ORD-1234/filename.webp
        const path = `photos/${entityId}/${file.name}`;

        // Convert the File/Blob to a Uint8Array to avoid "readableStream.getReader is not a function" in browser/Vite environment
        const arrayBuffer = await file.arrayBuffer();
        const bodyData = new Uint8Array(arrayBuffer);

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: path,
            Body: bodyData,
            ContentType: 'image/webp',
            // R2 uses standard S3 ACLs or public access settings
        });

        await r2Client.send(command);

        // Return the final URL
        return `${publicBaseUrl}/${path}`;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        // Inform user about potential CORS or key issues
        if (error instanceof Error && error.name === 'CredentialsError') {
            throw new Error('R2 Kimlik bilgileri hatalı veya süresi dolmuş.');
        }
        throw error;
    }
}
