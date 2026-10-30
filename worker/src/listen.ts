/**
 * The cook's ears: the phone's microphone, relayed to Muse Voice Transcribe's realtime socket so the Meta key never
 * ships in the app. Measured on his kitchen recordings (2026-10-27): it fixes the phone's mishears ("Charity did that"
 * → "Okay, I already did that.") and calls the end of speech ~1 s sooner (median 0.64 s). $0.18 an hour.
 *
 * The phone sends 16-bit mono PCM at 24 kHz as binary frames; Muse answers text events (`speechStart`, `partial`,
 * `speechEnd`, `speechComplete`, `error`), passed back untouched.
 */
export const MUSE_ASR_URL = "https://api.meta.ai/v1/asr/realtime";
/**
 * One socket lives at most 30 minutes. It reserves its worst case up front — 9¢ (Muse is $0.18 an hour, 0.3¢ a
 * minute) — against the day's cap, so held-open sockets can't spend past it, and settles to its real length when it
 * closes. It is counted with the looks, not the turns: his first PB&J's ~100 broken reconnects each took one of the
 * device's 150 daily turns, and by his fifth the coach answered "I've reached today's limit".
 */
export const LISTEN_MAX_MS = 30 * 60 * 1000;
export const LISTEN_RESERVE_MILLICENTS = 9_000;
/** 0.3¢ a minute, never below 0.1¢ a socket. */
export const listenMillicents = (ms: number) => Math.max(100, Math.ceil((ms / 60_000) * 300));
/** Audio held while Muse acknowledges the config: ~10 s at 48 KB/s. More than that and the relay gives up. */
export const MAX_HELD_BYTES = 500_000;

export function museConfig(key: string): string {
  return JSON.stringify({
    authorization: { accessToken: `Bearer ${key}` },
    audioEncoding: "PCM_24KHZ", model: "muse-voice-transcribe-1.0", mode: "ENDPOINTING", partialMode: "CUMULATIVE",
  });
}

/** A Muse event for the log: its type and, for an error, its message — never a transcript (the cook's words). */
export function museShape(data: string | ArrayBuffer | Blob): string {
  if (data instanceof Blob) return `blob ${data.size}`;
  if (typeof data !== "string") return `binary ${data.byteLength}`;
  try {
    const o = JSON.parse(data) as { type?: unknown; message?: unknown; sessionId?: unknown };
    if (o.type === "error") return `error ${String(o.message).slice(0, 120)}`;
    return o.type ? String(o.type).slice(0, 40) : o.sessionId ? "ack" : "untyped";
  } catch { return "not json"; }
}

/** The two sockets as the relay uses them, so tests can hand it fakes. */
export interface Sock {
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "message", fn: (e: { data: string | ArrayBuffer | Blob }) => void): void;
  addEventListener(type: "close" | "error", fn: (e?: { code?: number; reason?: string }) => void): void;
}

/**
 * Pipes the phone's socket to Muse's. The config (with our key) goes first; the phone's audio is held until Muse
 * acknowledges it, then flows. Whichever side closes, the other is closed; nothing outlives `maxMs`.
 */
export function relay(
  phone: Sock, muse: Sock, key: string, maxMs = LISTEN_MAX_MS, setTimer = setTimeout, log: (line: string) => void = () => {},
  onEnd: (openMs: number) => void = () => {}, now: () => number = Date.now,
): void {
  const opened = now();
  let open = true;
  // What crossed, for `wrangler tail` (his first PB&J, 2026-10-30: Muse answered "Malformed message" ~0.2 s after
  // every connect). Never the config: it carries our key.
  let fromPhone = 0;
  let fromMuse = 0;
  let acked = false;
  let held: ArrayBuffer[] = [];
  // Audio goes to Muse in arrival order, even when a frame has to be read out of a Blob first.
  let queue: Promise<void> = Promise.resolve();
  const toMuse = (data: ArrayBuffer | Blob) => {
    queue = queue.then(async () => {
      const bytes = data instanceof Blob ? await data.arrayBuffer() : data;
      if (!open) return;
      if (acked) { muse.send(bytes); return; }
      heldBytes += bytes.byteLength;
      if (heldBytes > MAX_HELD_BYTES) { end(1011, "muse_silent"); return; }
      held.push(bytes);
    }).catch(() => end(1011, "bad_audio"));
  };
  let heldBytes = 0;
  const end = (code = 1000, reason = "") => {
    if (!open) return;
    open = false;
    log(`listen end ${code} ${reason} phone=${fromPhone} muse=${fromMuse}`);
    onEnd(now() - opened);
    try { phone.close(code, reason); } catch {}
    try { muse.close(code, reason); } catch {}
  };
  muse.send(museConfig(key));
  muse.addEventListener("message", (e) => {
    if (!open) return;
    if (++fromMuse <= 6 || typeof e.data !== "string" || e.data.includes('"error"')) log(`muse ${fromMuse} ${museShape(e.data)}`);
    if (!acked) {
      acked = true;
      for (const m of held) muse.send(m);
      held = [];
    }
    // Muse speaks in JSON text; nothing else goes back to the phone.
    if (typeof e.data === "string") phone.send(e.data);
  });
  phone.addEventListener("message", (e) => {
    if (!open) return;
    if (++fromPhone <= 3) log(`phone ${fromPhone} ${museShape(e.data)}`);
    // Audio only: a text frame from the phone could re-configure Muse's session with our key behind it.
    if (typeof e.data === "string") { end(1003, "audio_only"); return; }
    // The deployed runtime hands the phone's binary frames over as Blobs (his second PB&J, 2026-10-30): sent on
    // as-is, a Blob reached Muse as the text "[object Blob]" — "Malformed message", every time.
    toMuse(e.data);
  });
  phone.addEventListener("close", () => end());
  phone.addEventListener("error", () => end(1011, "phone_error"));
  muse.addEventListener("close", (e?: { code?: number; reason?: string }) => end(1000, `muse closed ${e?.code ?? ""} ${e?.reason ?? ""}`));
  muse.addEventListener("error", () => end(1011, "muse_error"));
  setTimer(() => end(1000, "too_long"), maxMs);
}
