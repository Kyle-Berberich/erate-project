import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { extname } from 'path';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for Cloudflare R2
});

const BUCKET_NAME = process.env.S3_BUCKET || 'erate-files';

export interface UploadedFile {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  key: string;
}

/**
 * Generate a unique file key with path organization
 */
function generateFileKey(userId: string, category: string, originalFileName: string): string {
  const timestamp = Date.now();
  const randomId = randomBytes(8).toString('hex');
  const ext = extname(originalFileName);
  const baseName = originalFileName.replace(ext, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${category}/${userId}/${timestamp}-${randomId}-${baseName}${ext}`;
}

/**
 * Upload a file to S3-compatible storage
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string,
  category: string
): Promise<UploadedFile> {
  const key = generateFileKey(userId, category, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalFileName: fileName,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // Generate a signed URL valid for 1 hour
  const url = await getFileUrl(key, 3600);

  return {
    fileId: key,
    fileName,
    fileSize: fileBuffer.length,
    mimeType,
    url,
    key,
  };
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Download a file from storage
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List files for a user/category
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents?.map((item) => item.Key || '') || [];
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<any> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

/**
 * Generate a presigned upload URL (for client-side uploads)
 */
export async function getUploadUrl(
  fileName: string,
  mimeType: string,
  userId: string,
  category: string
): Promise<{ uploadUrl: string; key: string }> {
  const key = generateFileKey(userId, category, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    Metadata: {
      originalFileName: fileName,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

  return { uploadUrl, key };
}

/**
 * Validate file type against allowed types
 */
export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.replace('/*', '');
      return mimeType.startsWith(prefix);
    }
    return mimeType === type;
  });
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSizeBytes: number): boolean {
  return size <= maxSizeBytes;
}

// Common file type groups
export const FILE_TYPES = {
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ARCHIVES: ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed'],
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  DOCUMENT: 50 * 1024 * 1024, // 50 MB
  IMAGE: 10 * 1024 * 1024, // 10 MB
  ARCHIVE: 500 * 1024 * 1024, // 500 MB
};
