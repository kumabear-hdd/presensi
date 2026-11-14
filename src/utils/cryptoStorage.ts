import type { EncryptedPayload } from '../types/sims';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const toBase64 = (bytes: Uint8Array): string => {
  let str = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    str += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
  }
  return btoa(str);
};

export const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function deriveAesKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  const saltBuffer = new Uint8Array(salt).buffer;
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sealPayload<T>(
  key: CryptoKey,
  data: T
): Promise<EncryptedPayload> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(JSON.stringify(data));
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    i: toBase64(iv),
    c: toBase64(new Uint8Array(encrypted)),
  };
}

export async function openPayload<T>(
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<T> {
  const iv = new Uint8Array(fromBase64(payload.i));
  const cipher = new Uint8Array(fromBase64(payload.c));
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  return JSON.parse(textDecoder.decode(decrypted)) as T;
}

export async function hashAccountId(email: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    textEncoder.encode(`sims|${email}`)
  );
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const simsStorage = {
  async get<T>(collection: string, id: string): Promise<T | null> {
    const raw = localStorage.getItem(`sims:${collection}/${id}`);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set<T>(collection: string, id: string, obj: T): Promise<void> {
    localStorage.setItem(`sims:${collection}/${id}`, JSON.stringify(obj));
  },
  async list<T>(collection: string): Promise<Array<[string, T]>> {
    const prefix = `sims:${collection}/`;
    const rows: Array<[string, T]> = [];
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k);
      if (key && key.startsWith(prefix)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          rows.push([key.slice(prefix.length), JSON.parse(raw) as T]);
        }
      }
    }
    return rows;
  },
  async hasAnyAccount(): Promise<boolean> {
    return Object.keys(localStorage).some((k) => k.startsWith('sims:accts/'));
  },
};

export interface CompressedPhotoResult {
  u: string;
  n: string;
  k: number;
  o: number;
}

export async function compressImageFile(
  file: File,
  maxKb = 90
): Promise<CompressedPhotoResult> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  let blob: Blob | null = null;
  let mime = 'image/webp';

  for (;;) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    for (let q = 0.8; q > 0.35; q -= 0.1) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, q)
      );
      if (!blob) throw new Error('Image compression failed');
      if (mime === 'image/webp' && blob.type !== mime) {
        mime = 'image/jpeg';
        q += 0.1;
        continue;
      }
      if (blob.size <= maxKb * 1024) break;
    }
    if ((blob && blob.size <= maxKb * 1024) || scale < 0.35) break;
    scale *= 0.8;
  }

  if (bitmap.close) bitmap.close();
  if (!blob) throw new Error('Image compression failed');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

  return {
    u: dataUrl,
    n:
      file.name.replace(/\.[^.]+$/, '') +
      (mime === 'image/webp' ? '.webp' : '.jpg'),
    k: Math.max(1, Math.round(blob.size / 1024)),
    o: Math.max(1, Math.round(file.size / 1024)),
  };
}
