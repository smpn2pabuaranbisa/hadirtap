const SHEETS_SAFE_MAX_CHARS = 42_000;

function renderImageResized(
  img: HTMLImageElement,
  maxDimension: number,
  mimeType: 'image/png' | 'image/webp',
  quality?: number
): string | null {
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return quality !== undefined
    ? canvas.toDataURL(mimeType, quality)
    : canvas.toDataURL(mimeType);
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Format gambar tidak valid.'));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

export async function fitImageForSheets(
  dataUrl: string,
  maxDimension = 320,
  maxChars = SHEETS_SAFE_MAX_CHARS
): Promise<string> {
  if (!dataUrl || dataUrl.length <= maxChars) return dataUrl;

  const img = await loadImageElement(dataUrl);

  // 1. Try transparent WebP first (supports alpha transparency & very compact)
  const webpCandidates = [
    renderImageResized(img, maxDimension, 'image/webp', 0.85),
    renderImageResized(img, Math.min(maxDimension, 220), 'image/webp', 0.8),
    renderImageResized(img, 180, 'image/webp', 0.72),
    renderImageResized(img, 140, 'image/webp', 0.65),
  ];

  for (const candidate of webpCandidates) {
    if (
      candidate &&
      candidate.startsWith('data:image/webp') &&
      candidate.length <= maxChars
    ) {
      return candidate;
    }
  }

  // 2. Fallback to smaller transparent PNG if WebP is unsupported
  const pngSizes = [Math.min(maxDimension, 180), 140, 110, 88];
  for (const size of pngSizes) {
    const candidate = renderImageResized(img, size, 'image/png');
    if (candidate && candidate.length <= maxChars) {
      return candidate;
    }
  }

  // Last resort smallest WebP/PNG
  return (
    renderImageResized(img, 96, 'image/webp', 0.6) ||
    renderImageResized(img, 80, 'image/png') ||
    dataUrl.slice(0, maxChars)
  );
}

/**
 * Reads an uploaded image file and resizes it cleanly while preserving
 * transparency so logos and handwritten signatures stay crisp and
 * fit comfortably inside both localStorage and Google Sheets cells.
 */
export function processUploadedImage(
  file: File,
  maxDimension = 320
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = async () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('File gambar kosong.'));
        return;
      }

      // Keep SVG directly if small enough for Google Sheets
      if (
        file.type === 'image/svg+xml' &&
        result.length <= SHEETS_SAFE_MAX_CHARS
      ) {
        resolve(result);
        return;
      }

      try {
        const img = await loadImageElement(result);
        const pngData = renderImageResized(img, maxDimension, 'image/png');
        if (pngData && pngData.length <= SHEETS_SAFE_MAX_CHARS) {
          resolve(pngData);
          return;
        }
        const fitted = await fitImageForSheets(
          pngData || result,
          maxDimension,
          SHEETS_SAFE_MAX_CHARS
        );
        resolve(fitted);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Format gambar tidak valid.'));
      }
    };
    reader.readAsDataURL(file);
  });
}
