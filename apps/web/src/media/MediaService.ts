import type { Id } from "../../../../convex/_generated/dataModel";

export interface MediaUploadProgress {
  fileName: string;
  percent: number;
  phase: "preparing" | "uploading" | "processing" | "complete";
}

export interface UploadedMedia {
  mediaId?: Id<"propertyMedia">;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

export interface MediaService {
  kind: "convex" | "browser";
  uploadImage(
    file: File,
    options?: {
      propertyId?: Id<"properties">;
      onProgress?: (progress: MediaUploadProgress) => void;
    },
  ): Promise<UploadedMedia>;
  uploadVideo(
    file: File,
    options?: {
      propertyId?: Id<"properties">;
      onProgress?: (progress: MediaUploadProgress) => void;
    },
  ): Promise<UploadedMedia>;
}
