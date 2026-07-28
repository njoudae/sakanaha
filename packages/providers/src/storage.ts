import type { ProviderAdapterBase, ProviderConfig, ProviderUsageContext } from "./providerTypes";

export type StorageProviderName = "convex" | "awsS3" | "cloudflareR2" | "disabled";

export interface UploadTarget {
  uploadUrl: string;
  storageId?: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

export interface UploadRequest {
  fileName: string;
  mimeType: string;
  byteSize: number;
  checksum?: string;
  context?: ProviderUsageContext;
}

export const DEFAULT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DEFAULT_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export function validateImageUpload(
  request: Pick<UploadRequest, "fileName" | "mimeType" | "byteSize">,
  config: Pick<StorageProviderConfig, "allowedMimeTypes" | "maxUploadBytes">,
): void {
  if (!request.fileName.trim() || request.fileName.length > 255) {
    throw new Error("The image file name is invalid.");
  }
  if (!config.allowedMimeTypes.includes(request.mimeType)) {
    throw new Error("The selected image type is not supported.");
  }
  if (!Number.isSafeInteger(request.byteSize) || request.byteSize <= 0) {
    throw new Error("The image file is empty or invalid.");
  }
  if (request.byteSize > config.maxUploadBytes) {
    throw new Error("The selected image exceeds the maximum upload size.");
  }
}

export function validateVideoUpload(
  request: Pick<UploadRequest, "fileName" | "mimeType" | "byteSize">,
  maxUploadBytes: number,
): void {
  if (!request.fileName.trim() || request.fileName.length > 255) {
    throw new Error("The video file name is invalid.");
  }
  if (!(DEFAULT_VIDEO_MIME_TYPES as readonly string[]).includes(request.mimeType)) {
    throw new Error("The selected video type is not supported.");
  }
  if (!Number.isSafeInteger(request.byteSize) || request.byteSize <= 0) {
    throw new Error("The video file is empty or invalid.");
  }
  if (request.byteSize > maxUploadBytes) {
    throw new Error("The selected video exceeds the maximum upload size.");
  }
}

export function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export function hasExpectedVideoSignature(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  }
  if (mimeType === "video/webm") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  }
  return false;
}

export interface StoredObjectMetadata {
  storageId: string;
  mimeType: string;
  byteSize: number;
  checksum?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface StorageProvider extends ProviderAdapterBase<StorageProviderName> {
  createUploadTarget(request: UploadRequest): Promise<UploadTarget>;
  attachObject(storageId: string, context?: ProviderUsageContext): Promise<StoredObjectMetadata>;
  deleteObject(storageId: string, context?: ProviderUsageContext): Promise<void>;
}

export type StorageProviderConfig = ProviderConfig<StorageProviderName> & {
  maxUploadBytes: number;
  allowedMimeTypes: readonly string[];
};
