/**
 * Auth utilities for server-side token signing/verification.
 * Uses HMAC-SHA256 via Web Crypto API (works in Edge Runtime & Node).
 */

const encoder = new TextEncoder();

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a signed token: base64(payload).signature
 */
export async function signToken(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${bufToHex(sig)}`;
}

/**
 * Verify a signed token and return the payload, or null if invalid.
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;

    const key = await getKey(secret);
    const sigBuf = new Uint8Array(
      sig.match(/.{2}/g)!.map((h) => parseInt(h, 16))
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      encoder.encode(data)
    );
    if (!valid) return null;

    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}

/** Cookie name used across all auth endpoints */
export const AUTH_COOKIE = "grace_auth";

/** Token expiry: 7 days (seconds) */
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;
