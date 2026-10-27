/** What the app hears back from a turn, in order: maybe an ack, then text pieces, then done or an error. */
export type CoachEvent =
  | { type: "ack"; text: string }
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; text: string };

const enc = new TextEncoder();

export function encodeEvent(e: CoachEvent): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(e)}\n\n`);
}
