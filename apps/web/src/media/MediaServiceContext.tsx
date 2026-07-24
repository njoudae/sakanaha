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
};

export const MediaServiceContext = createContext<MediaService>(browserMediaService);

export function useMediaService() {
  return useContext(MediaServiceContext);
}
