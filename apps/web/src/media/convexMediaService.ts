import type { Id } from "../../../../convex/_generated/dataModel";
import type { MediaService, MediaUploadProgress } from "./MediaService";
import { prepareImage } from "./imageProcessing";

interface UploadTarget {
  mediaId: Id<"propertyMedia">;
  uploadUrl: string;
  thumbnailUploadUrl: string;
}

interface VideoUploadTarget {
  mediaId: Id<"propertyMedia">;
  uploadUrl: string;
}

interface ConvexMediaOperations {
  createUpload(args: {
    propertyId?: Id<"properties">;
    fileName: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    width: number;
    height: number;
  }): Promise<UploadTarget>;
  retryUpload(args: { mediaId: Id<"propertyMedia"> }): Promise<UploadTarget>;
  registerUploadedImage(args: {
    mediaId: Id<"propertyMedia">;
    storageId: Id<"_storage">;
  }): Promise<null>;
  registerUploadedThumbnail(args: {
    mediaId: Id<"propertyMedia">;
    thumbnailStorageId: Id<"_storage">;
  }): Promise<null>;
  finalizeUpload(args: {
    mediaId: Id<"propertyMedia">;
    width: number;
    height: number;
  }): Promise<{ mediaId: Id<"propertyMedia">; url: string; thumbnailUrl: string }>;
  createVideoUpload(args: {
    propertyId?: Id<"properties">;
    fileName: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
  }): Promise<VideoUploadTarget>;
  registerUploadedVideo(args: {
    mediaId: Id<"propertyMedia">;
    storageId: Id<"_storage">;
  }): Promise<null>;
  finalizeVideoUpload(args: {
    mediaId: Id<"propertyMedia">;
  }): Promise<{ mediaId: Id<"propertyMedia">; url: string }>;
}

function postBlob(
  url: string,
  blob: Blob,
  onProgress: (loaded: number, total: number) => void,
): Promise<Id<"_storage">> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Content-Type", blob.type);
    request.upload.onprogress = (event) =>
      onProgress(event.loaded, event.lengthComputable ? event.total : blob.size);
    request.onerror = () => reject(new Error("تعذر الاتصال بخدمة رفع الصور."));
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("فشل رفع الصورة. يرجى المحاولة مرة أخرى."));
        return;
      }
      try {
        const response = JSON.parse(request.responseText) as { storageId?: Id<"_storage"> };
        if (!response.storageId) throw new Error("Missing storage identifier.");
        resolve(response.storageId);
      } catch {
        reject(new Error("استجابة خدمة رفع الصور غير صالحة."));
      }
    };
    request.send(blob);
  });
}

function report(
  fileName: string,
  phase: MediaUploadProgress["phase"],
  percent: number,
  callback?: (progress: MediaUploadProgress) => void,
) {
  callback?.({ fileName, phase, percent: Math.max(0, Math.min(100, Math.round(percent))) });
}

export function createConvexMediaService(operations: ConvexMediaOperations): MediaService {
  return {
    kind: "convex",
    async uploadImage(file, options = {}) {
      report(file.name, "preparing", 0, options.onProgress);
      const prepared = await prepareImage(file);
      let target = await operations.createUpload({
        propertyId: options.propertyId,
        fileName: file.name,
        mimeType: prepared.mimeType,
        byteSize: prepared.image.size,
        checksum: prepared.checksum,
        width: prepared.width,
        height: prepared.height,
      });
      let lastError: unknown;
      for (let attempt = 0; attempt <= 3; attempt += 1) {
        try {
          const totalBytes = prepared.image.size + prepared.thumbnail.size;
          const storageId = await postBlob(target.uploadUrl, prepared.image, (loaded) =>
            report(file.name, "uploading", (loaded / totalBytes) * 90, options.onProgress),
          );
          await operations.registerUploadedImage({ mediaId: target.mediaId, storageId });
          const thumbnailStorageId = await postBlob(
            target.thumbnailUploadUrl,
            prepared.thumbnail,
            (loaded) =>
              report(
                file.name,
                "uploading",
                ((prepared.image.size + loaded) / totalBytes) * 90,
                options.onProgress,
              ),
          );
          await operations.registerUploadedThumbnail({
            mediaId: target.mediaId,
            thumbnailStorageId,
          });
          report(file.name, "processing", 95, options.onProgress);
          const completed = await operations.finalizeUpload({
            mediaId: target.mediaId,
            width: prepared.width,
            height: prepared.height,
          });
          report(file.name, "complete", 100, options.onProgress);
          return { ...completed, width: prepared.width, height: prepared.height };
        } catch (error) {
          lastError = error;
          if (attempt === 3) break;
          target = await operations.retryUpload({ mediaId: target.mediaId });
        }
      }
      throw lastError instanceof Error ? lastError : new Error("فشل رفع الصورة.");
    },
    async uploadVideo(file, options = {}) {
      if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
        throw new Error("صيغة الفيديو غير مدعومة.");
      }
      if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
        throw new Error("حجم الفيديو يجب ألا يتجاوز 10 ميجابايت.");
      }
      report(file.name, "preparing", 5, options.onProgress);
      const checksum = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
      )
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      let target = await operations.createVideoUpload({
        propertyId: options.propertyId,
        fileName: file.name,
        mimeType: file.type,
        byteSize: file.size,
        checksum,
      });
      let lastError: unknown;
      for (let attempt = 0; attempt <= 3; attempt += 1) {
        try {
          const storageId = await postBlob(target.uploadUrl, file, (loaded, total) =>
            report(file.name, "uploading", (loaded / total) * 90, options.onProgress),
          );
          await operations.registerUploadedVideo({ mediaId: target.mediaId, storageId });
          report(file.name, "processing", 95, options.onProgress);
          const completed = await operations.finalizeVideoUpload({ mediaId: target.mediaId });
          report(file.name, "complete", 100, options.onProgress);
          return { ...completed, width: 0, height: 0 };
        } catch (error) {
          lastError = error;
          if (attempt === 3) break;
          target = await operations.retryUpload({ mediaId: target.mediaId });
        }
      }
      throw lastError instanceof Error ? lastError : new Error("فشل رفع الفيديو.");
    },
  };
}
