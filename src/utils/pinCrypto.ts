/**
 * Deterministic 4-digit PIN hashing for client-side profile isolation.
 * Uses Web Crypto SHA-256 when available, with a deterministic FNV/SHA-like
 * fallback for synchronous or non-secure environments.
 */
export async function hashPin(pin: string): Promise<string> {
  const normalized = pin.trim();
  const payload = `mizan-pin-salt-v1:${normalized}`;

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return syncFallbackHash(payload);
}

export function syncHashPin(pin: string): string {
  return syncFallbackHash(`mizan-pin-salt-v1:${pin.trim()}`);
}

function syncFallbackHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i << 3);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fb_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function verifyPin(pin: string, expectedHash: string | null): Promise<boolean> {
  if (!expectedHash) return true;
  if (expectedHash.startsWith('fb_')) {
    return syncHashPin(pin) === expectedHash;
  }
  const candidate = await hashPin(pin);
  return candidate === expectedHash;
}
