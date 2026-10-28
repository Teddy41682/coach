/**
 * A short-lived token from the host app, accepted in `X-Coach-Key` in place of the app key. The host app mints it
 * after its own checks, signed with a secret it shares with this Worker (`COACH_TOKEN_SECRET`):
 *
 *   v1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "v1." + base64url(payload)))>
 *   payload: {"sub":"<32 hex>","aud":"coach","iat":<s>,"exp":<s>,"jti":"<32 hex>"}
 *
 * `sub` is an opaque, stable id for the person; it is what the per-person limits count against.
 */
export const TOKEN_MAX_LIFETIME_S = 3600;
export const TOKEN_SKEW_S = 60;
const SUB = /^[0-9a-f]{32}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;

function fromB64url(s: string): Uint8Array | null {
  if (!B64URL.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch { return null; }
}

/** Constant-time over the bytes, so a signature can't be found a byte at a time from response timing. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** The token's `sub` if it is genuine, for this coach, and current; otherwise null. No secret, no tokens. */
export async function verifyToken(token: string | null, secret: string | undefined, nowMs: number): Promise<string | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const given = fromB64url(parts[2]);
  const body = fromB64url(parts[1]);
  if (!given || !body) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v1.${parts[1]}`)));
  if (!sameBytes(given, mac)) return null;
  let p: { sub?: unknown; aud?: unknown; iat?: unknown; exp?: unknown };
  try { p = JSON.parse(new TextDecoder().decode(body)); } catch { return null; }
  if (!p || typeof p !== "object") return null;
  const { sub, aud, iat, exp } = p;
  if (typeof sub !== "string" || !SUB.test(sub)) return null;
  if (aud !== "coach") return null;
  if (!Number.isInteger(iat) || !Number.isInteger(exp)) return null;
  const now = Math.floor(nowMs / 1000);
  if ((exp as number) + TOKEN_SKEW_S < now) return null;
  if ((iat as number) - TOKEN_SKEW_S > now) return null;
  if ((exp as number) <= (iat as number) || (exp as number) - (iat as number) > TOKEN_MAX_LIFETIME_S) return null;
  return sub;
}
