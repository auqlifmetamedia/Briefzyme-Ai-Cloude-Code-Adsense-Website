import { getAdminHeaders } from './remote.ts';

const MAX_SOURCE_BYTES = 15 * 1024 * 1024; // file asli maks 15 MB
const MAX_OUTPUT_BYTES = 1_500_000; // hasil kompres maks ~1,5 MB

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Gagal membaca gambar'));
    r.readAsDataURL(blob);
  });
}

async function toCanvas(file: Blob, maxWidth: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung pengolahan gambar');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, maxWidth = 1600): Promise<{ base64: string; contentType: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Pilih file gambar JPG, PNG, WebP, atau GIF.');
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error('File terlalu besar (maksimal 15 MB).');

  let width = maxWidth;
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = await toCanvas(file, width);
    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      let blob = await canvasToBlob(canvas, 'image/webp', q);
      if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', q); // browser tanpa WebP
      if (blob && blob.size <= MAX_OUTPUT_BYTES) {
        return { base64: await blobToBase64(blob), contentType: blob.type };
      }
    }
    width = Math.round(width * 0.75); // masih terlalu besar: kecilkan ukuran
  }
  throw new Error('Gambar tidak bisa dikompres cukup kecil. Coba gambar lain.');
}

export async function uploadImageFile(file: File): Promise<string> {
  const { base64, contentType } = await compressImage(file);
  const res = await fetch('/api/admin/images', {
    method: 'POST',
    headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ data: base64, contentType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || `Unggah gagal (HTTP ${res.status})`);
  return data.url as string;
}

// Gambar buatan AI berbentuk data-URL (base64) dipindahkan ke penyimpanan agar artikel tetap ringan.
export async function ensureHostedImage(url: string): Promise<string> {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!m) return url;
  try {
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    return await uploadImageFile(new File([bytes], 'image', { type: m[1] }));
  } catch {
    return url;
  }
}
