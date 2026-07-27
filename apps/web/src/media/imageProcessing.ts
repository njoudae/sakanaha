import saknahaLogoUrl from "../assets/saknaha-logo.png";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const WATERMARK_WIDTH_RATIO = 0.22;
const WATERMARK_MAX_WIDTH = 320;
const WATERMARK_MIN_WIDTH = 72;
const WATERMARK_MARGIN_RATIO = 0.025;
let watermarkPromise: Promise<HTMLImageElement> | undefined;

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

function loadWatermark() {
  watermarkPromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("تعذر تحميل شعار المنصة لإضافة العلامة المائية."));
    image.src = saknahaLogoUrl;
  });
  return watermarkPromise;
}

export function calculateWatermarkLayout(
  canvasWidth: number,
  canvasHeight: number,
  logoWidth: number,
  logoHeight: number,
) {
  const maximumMargin = Math.max(0, Math.floor((Math.min(canvasWidth, canvasHeight) - 1) / 2));
  const margin = Math.min(
    maximumMargin,
    Math.max(8, Math.round(Math.min(canvasWidth, canvasHeight) * WATERMARK_MARGIN_RATIO)),
  );
  const availableWidth = Math.max(1, canvasWidth - margin * 2);
  const availableHeight = Math.max(1, canvasHeight - margin * 2);
  const desiredWidth = Math.min(
    WATERMARK_MAX_WIDTH,
    Math.max(WATERMARK_MIN_WIDTH, Math.round(canvasWidth * WATERMARK_WIDTH_RATIO)),
  );
  const width = Math.max(
    1,
    Math.round(Math.min(desiredWidth, availableWidth, availableHeight * (logoWidth / logoHeight))),
  );
  const height = Math.max(1, Math.round((width / logoWidth) * logoHeight));
  return {
    x: canvasWidth - width - margin,
    y: canvasHeight - height - margin,
    width,
    height,
  };
}

async function renderWebp(bitmap: ImageBitmap, maxDimension: number, quality: number) {
  const dimensions = scaledDimensions(bitmap.width, bitmap.height, maxDimension);
  const watermark = await loadWatermark();
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("تعذر تجهيز الصورة للرفع.");
  context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);
  const layout = calculateWatermarkLayout(
    dimensions.width,
    dimensions.height,
    watermark.naturalWidth,
    watermark.naturalHeight,
  );
  context.save();
  context.globalAlpha = 0.82;
  context.drawImage(watermark, layout.x, layout.y, layout.width, layout.height);
  context.restore();
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
    return {
      image: compressed.blob,
      thumbnail: thumbnail.blob,
      width: compressed.width,
      height: compressed.height,
      mimeType: "image/webp",
      checksum: await sha256(compressed.blob),
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
