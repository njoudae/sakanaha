import { createContext, useContext } from "react";
import type { MediaService } from "./MediaService";
import { blobToDataUrl, prepareImage } from "./imageProcessing";

export const browserMediaService: MediaService = {
  kind: "browser",
  async uploadImage(file, options = {}) {
    options.onProgress?.({ fileName: file.name, phase: "preparing", percent: 0 });
    const prepared = await prepareImage(file);
    const url = await blobToDataUrl(prepared.image);
    options.onProgress?.({ fileName: file.name, phase: "complete", percent: 100 });
    return { url, width: prepared.width, height: prepared.height };
  },
  async uploadVideo(file, options = {}) {
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) throw new Error("صيغة الفيديو غير مدعومة.");
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      throw new Error("حجم الفيديو يجب ألا يتجاوز 10 ميجابايت.");
    }
    options.onProgress?.({ fileName: file.name, phase: "preparing", percent: 10 });
    const url = await blobToDataUrl(file);
    options.onProgress?.({ fileName: file.name, phase: "complete", percent: 100 });
    return { url, width: 0, height: 0 };
  },
};

export const MediaServiceContext = createContext<MediaService>(browserMediaService);

export function useMediaService() {
  return useContext(MediaServiceContext);
}
