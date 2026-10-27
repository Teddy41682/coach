import type { ModelConnector, ModelRequest } from "./connector";

const URL_ = "https://api.meta.ai/v1/chat/completions";

/**
 * Meta's Muse Spark through the Model API's OpenAI-shaped chat completions, streamed. Standard tier only: the
 * contributor tier lets Meta train on what we send (a kitchen, a home), so a contributor model is refused outright.
 * `minimal` effort because `low` measured empty answers at our token cap (outputs/2026-10-27-latency.md).
 */
export class MuseConnector implements ModelConnector {
  constructor(
    private readonly apiKey: string,
    private readonly model = "muse-spark-1.3",
    private readonly effort = "minimal",
    // Wrapped, not passed bare: Workers throws "Illegal invocation" when fetch is called through a reference.
    private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
    // Room for the reasoning and a whole answer: at 400, reasoning ate the allowance and answers stopped mid-word.
    private readonly maxTokens = 1_200,
  ) {
    if (model.includes("contributor")) throw new Error(`${model}: Coach uses the standard tier only`);
  }

  async *stream(req: ModelRequest, signal: AbortSignal): AsyncIterable<string> {
    const res = await this.fetchImpl(URL_, {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        reasoning_effort: this.effort,
        max_completion_tokens: this.maxTokens,
        messages: [
          { role: "system", content: req.system },
          {
            role: "user",
            content: [
              { type: "text", text: req.user },
              ...req.images.map((b64) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } })),
            ],
          },
        ],
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Muse Spark answered ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        const text = JSON.parse(data).choices?.[0]?.delta?.content;
        if (text) yield text as string;
      }
    }
  }
}
