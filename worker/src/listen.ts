/**
 * The cook's ears: the phone's microphone, relayed to Muse Voice Transcribe's realtime socket so the Meta key never
 * ships in the app. Measured on his kitchen recordings (2026-10-27): it fixes the phone's mishears ("Charity did that"
 * → "Okay, I already did that.") and calls the end of speech ~1 s sooner (median 0.64 s). $0.18 an hour.
 *
 * The phone sends 16-bit mono PCM at 24 kHz as binary frames; Muse answers text events (`speechStart`, `partial`,
 * `speechEnd`, `speechComplete`, `error`), passed back untouched.
 */
export const MUSE_ASR_URL = "https://api.meta.ai/v1/asr/realtime";
/** Longer than any cook we'd coach (the boule is the longest, under 3 h of hands-on time); then the socket closes. */
export const LISTEN_MAX_MS = 3 * 60 * 60 * 1000;
/** Audio held while Muse acknowledges the config: ~10 s at 48 KB/s. More than that and the relay gives up. */
export const MAX_HELD_BYTES = 500_000;

export function museConfig(key: string): string {
  return JSON.stringify({
    authorization: { accessToken: `Bearer ${key}` },
    audioEncoding: "PCM_24KHZ", model: "muse-voice-transcribe-1.0", mode: "ENDPOINTING", partialMode: "CUMULATIVE",
  });
}

/** The two sockets as the relay uses them, so tests can hand it fakes. */
export interface Sock {
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "message", fn: (e: { data: string | ArrayBuffer }) => void): void;
  addEventListener(type: "close" | "error", fn: () => void): void;
}

/**
 * Pipes the phone's socket to Muse's. The config (with our key) goes first; the phone's audio is held until Muse
 * acknowledges it, then flows. Whichever side closes, the other is closed; nothing outlives `maxMs`.
 */
export function relay(phone: Sock, muse: Sock, key: string, maxMs = LISTEN_MAX_MS, setTimer = setTimeout): void {
  let open = true;
  let acked = false;
  let held: (string | ArrayBuffer)[] = [];
  let heldBytes = 0;
  const end = (code = 1000, reason = "") => {
    if (!open) return;
    open = false;
    try { phone.close(code, reason); } catch {}
    try { muse.close(code, reason); } catch {}
  };
  muse.send(museConfig(key));
  muse.addEventListener("message", (e) => {
    if (!open) return;
    if (!acked) {
      acked = true;
      for (const m of held) muse.send(m);
      held = [];
    }
    phone.send(e.data);
  });
  phone.addEventListener("message", (e) => {
    if (!open) return;
    if (acked) { muse.send(e.data); return; }
    heldBytes += typeof e.data === "string" ? e.data.length : e.data.byteLength;
    if (heldBytes > MAX_HELD_BYTES) { end(1011, "muse_silent"); return; }
    held.push(e.data);
  });
  phone.addEventListener("close", () => end());
  phone.addEventListener("error", () => end(1011, "phone_error"));
  muse.addEventListener("close", () => end());
  muse.addEventListener("error", () => end(1011, "muse_error"));
  setTimer(() => end(1000, "too_long"), maxMs);
}
