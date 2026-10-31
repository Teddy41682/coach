/** What the app hears back from a turn, in order: maybe an ack, text pieces, the coach's decision, then done — or an error. */
export type CoachEvent =
  | { type: "ack"; text: string }
  | { type: "text"; text: string }
  | { type: "action"; action: "next" | "stay" | "hold" }
  | { type: "done" }
  | { type: "error"; text: string }
  /** A slip's ruling, decided in code (cooking-pack/slip.ts) — for the exam; the phone ignores it. */
  | { type: "verdict"; verdict: "fine" | "fixable" | "redo" | "unknown" | "taste"; item: string; ratio: number | null; by?: number };

const enc = new TextEncoder();

export function encodeEvent(e: CoachEvent): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(e)}\n\n`);
}
