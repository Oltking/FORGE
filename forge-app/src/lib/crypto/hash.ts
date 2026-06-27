/**
 * Hashing primitives — isomorphic SHA-256 over the Web Crypto API.
 *
 * Works identically in the browser, in Node, and in edge runtimes, so a
 * commitment computed by the server can be reproduced byte-for-byte by a
 * verifier in the browser with no server involved.
 */

const encoder = new TextEncoder();

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error("hexToBytes: odd-length hex string");
  }
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error("hexToBytes: invalid hex characters");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Pass a fresh ArrayBuffer copy so callers' views are never aliased.
  const buf = await crypto.subtle.digest("SHA-256", data.slice());
  return new Uint8Array(buf);
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? encoder.encode(data) : data;
  return bytesToHex(await sha256(bytes));
}

export function utf8(s: string): Uint8Array {
  return encoder.encode(s);
}

/**
 * Cryptographically strong random salt (32 bytes) as hex.
 * A per-seal salt makes a low-entropy payload ("BTC up by Friday") impossible to
 * brute-force from its commitment hash before reveal.
 */
export function randomSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
