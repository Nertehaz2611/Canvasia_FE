const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.7;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export type ImageCompressionOptions = {
  maxDimension?: number;
  quality?: number;
};

function buildOutputName(originalName: string, mimeType: string): string {
  const trimmed = originalName.trim();
  if (!trimmed) {
    return "upload";
  }

  const extension = mimeType === "image/png" ? "png" : "jpg";
  return trimmed.replace(/\.[^/.]+$/, `.${extension}`);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

async function drawToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  if ("createImageBitmap" in globalThis) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable");
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return { canvas, width: canvas.width, height: canvas.height };
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.drawImage(image, 0, 0);
  return { canvas, width: canvas.width, height: canvas.height };
}

function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (canvas.width === width && canvas.height === height) {
    return canvas;
  }

  const resized = document.createElement("canvas");
  resized.width = width;
  resized.height = height;
  const context = resized.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }
  context.drawImage(canvas, 0, 0, width, height);
  return resized;
}

export async function compressImageFile(file: File, options: ImageCompressionOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (file.size <= DEFAULT_MAX_BYTES) {
    return file;
  }

  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = options;
  const { canvas, width, height } = await drawToCanvas(file);
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const outputType = "image/jpeg";
  const outputName = buildOutputName(file.name, outputType);

  const resized = resizeCanvas(canvas, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    resized.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Image compression failed"))),
      outputType,
      quality
    );
  });

  return new File([blob], outputName, { type: outputType, lastModified: file.lastModified });
}

export async function compressImageFiles(files: File[], options?: ImageCompressionOptions): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageFile(file, options)));
}
