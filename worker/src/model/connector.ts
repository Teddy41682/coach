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
