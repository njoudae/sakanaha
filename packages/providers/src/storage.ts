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
