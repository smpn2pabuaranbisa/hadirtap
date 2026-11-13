/**
 * Reads an uploaded image file and resizes it cleanly while preserving
 * PNG transparency so logos and handwritten signatures stay crisp and
 * fit comfortably inside localStorage.
 */
export function processUploadedImage(
  file: File,
  maxDimension = 420
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('File gambar kosong.'));
        return;
      }

      // Keep SVG directly if small
      if (file.type === 'image/svg+xml' && result.length < 200_000) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Output PNG to preserve transparent background for logos & signatures
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
