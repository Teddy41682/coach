/** What every model behind Coach must do: stream an answer's text for a prompt and some images. */
export type ModelRequest = {
  system: string;
  user: string;
  /** Base64 JPEG frames, oldest first. */
  images: string[];
};

export interface ModelConnector {
  stream(req: ModelRequest, signal: AbortSignal): AsyncIterable<string>;
}

/** What a call really used, from the model's own answer — the basis for any cost discussion. */
export type Usage = { input: number; cachedInput: number; output: number };

/** A whole (non-streamed) answer, for background work like the observer where nothing is spoken as it arrives. */
export interface Completer {
  complete(req: ModelRequest, signal?: AbortSignal): Promise<{ text: string; usage: Usage }>;
}
