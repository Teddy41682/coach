export type Action = "next" | "stay";

/**
 * Takes the model's streamed text and holds back its control line — `[[next]]` or `[[stay]]`, the coach's
 * decision about the step — so it is never spoken, even when it arrives split across chunks. Text after the
 * control is dropped. No control, an unknown one, or an unfinished one means stay.
 */
export class ControlFilter {
  private pending = "";
  private action: Action = "stay";
  private closed = false;

  /** The part of `text` that is safe to speak now. */
  push(text: string): string {
    if (this.closed) return "";
    this.pending += text;
    const open = this.pending.indexOf("[[");
    if (open >= 0) {
      const close = this.pending.indexOf("]]", open + 2);
      const speak = this.pending.slice(0, open);
      if (close < 0) { this.pending = this.pending.slice(open); return speak; }
      if (this.pending.slice(open + 2, close).trim().toLowerCase() === "next") this.action = "next";
      this.closed = true;
      this.pending = "";
      return speak;
    }
    // A trailing "[" might be the start of a control: hold it until the next chunk says.
    const hold = this.pending.endsWith("[") ? 1 : 0;
    const speak = this.pending.slice(0, this.pending.length - hold);
    this.pending = this.pending.slice(this.pending.length - hold);
    return speak;
  }

  /** At the end of the answer: anything still safe to speak, and the decision. */
  end(): { speak: string; action: Action } {
    const rest = this.closed || this.pending.startsWith("[[") ? "" : this.pending;
    this.closed = true;
    this.pending = "";
    return { speak: rest, action: this.action };
  }
}
