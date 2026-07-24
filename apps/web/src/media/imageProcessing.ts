const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface PreparedImage {
  image: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  mimeType: string;
  checksum: string;
}

function validateSource(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("نوع الصورة المحدد غير مدعوم.");
  if (file.size <= 0) throw new Error("ملف الصورة فارغ أو غير صالح.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("حجم الصورة يتجاوز الحد الأقصى المسموح.");
}

function scaledDimensions(width: number, height: number, maxDimension: number) {
  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function renderWebp(bitmap: ImageBitmap, maxDimension: number, quality: number) {
  const dimensions = scaledDimensions(bitmap.width, bitmap.height, maxDimension);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("تعذر تجهيز الصورة للرفع.");
  context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("تعذر ضغط الصورة.");
  return { blob, ...dimensions };
}

async function sha256(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  validateSource(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("محتوى ملف الصورة غير صالح.");
  }
  try {
    const compressed = await renderWebp(bitmap, 2_000, 0.82);
    const thumbnail = await renderWebp(bitmap, 480, 0.76);
    const useCompressed =
      compressed.blob.size < file.size || Math.max(bitmap.width, bitmap.height) > 2_000;
    const image = useCompressed ? compressed.blob : file;
    return {
      image,
      thumbnail: thumbnail.blob,
      width: useCompressed ? compressed.width : bitmap.width,
      height: useCompressed ? compressed.height : bitmap.height,
      mimeType: useCompressed ? "image/webp" : file.type,
      checksum: await sha256(image),
    };
  } finally {
    bitmap.close();
  }
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(blob);
  });
}
