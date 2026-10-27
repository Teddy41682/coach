import { describe, expect, it, vi, afterEach } from "vitest";
import { MuseConnector } from "../src/model/muse";

function sseBody(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({ start(c) { for (const l of lines) c.enqueue(enc.encode(l)); c.close(); } });
}

describe("MuseConnector", () => {
  it("posts an OpenAI-shaped streamed request and yields the content deltas", async () => {
    let url = ""; let init: RequestInit | undefined;
    const fetchImpl = (async (u: string, i: RequestInit) => {
      url = u; init = i;
      return new Response(sseBody([
        'data: {"choices":[{"delta":{"content":"Mix "}}]}\n\n',
        'data: {"choices":[{"delta":{}}]}\n\ndata: {"choices":[{"delta":{"content":"more."}}]}\n\n',
        "data: [DONE]\n\n",
      ]));
    }) as unknown as typeof fetch;
    const m = new MuseConnector("KEY", "muse-spark-1.3", "minimal", fetchImpl);
    const out: string[] = [];
    for await (const t of m.stream({ system: "S", user: "U", images: ["IMG"] }, new AbortController().signal)) out.push(t);

    expect(out).toEqual(["Mix ", "more."]);
    expect(url).toBe("https://api.meta.ai/v1/chat/completions");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer KEY");
    const body = JSON.parse(init!.body as string);
    expect(body).toMatchObject({ model: "muse-spark-1.3", stream: true, reasoning_effort: "minimal" });
    expect(body.messages[0]).toEqual({ role: "system", content: "S" });
    expect(body.messages[1].content).toEqual([
      { type: "text", text: "U" },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,IMG" } },
    ]);
  });

  it("refuses a contributor-tier model", () => {
    expect(() => new MuseConnector("KEY", "muse-spark-1.3-contributor")).toThrow(/standard tier/);
  });

  it("throws on a non-200 answer", async () => {
    const fetchImpl = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const m = new MuseConnector("KEY", "muse-spark-1.3", "minimal", fetchImpl);
    const it = m.stream({ system: "", user: "", images: [] }, new AbortController().signal)[Symbol.asyncIterator]();
    await expect(it.next()).rejects.toThrow(/401/);
  });

  it("calls the platform fetch unbound by default (Workers throws 'Illegal invocation' otherwise)", async () => {
    vi.stubGlobal("fetch", function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(new Response(sseBody(['data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', "data: [DONE]\n\n"])));
    });
    const out: string[] = [];
    for await (const t of new MuseConnector("KEY").stream({ system: "", user: "", images: [] }, new AbortController().signal)) out.push(t);
    expect(out).toEqual(["ok"]);
  });


  it("gives turn answers room to think and still finish (400 cut answers mid-word, 2026-10-27)", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_u: string, i: RequestInit) => { body = JSON.parse(i.body as string); return new Response(sseBody(["data: [DONE]\n\n"])); }) as unknown as typeof fetch;
    for await (const _ of new MuseConnector("KEY", "muse-spark-1.3", "minimal", fetchImpl).stream({ system: "", user: "", images: [] }, new AbortController().signal)) { /* drain */ }
    expect(body.max_completion_tokens).toBe(1_200);
  });
});

afterEach(() => vi.unstubAllGlobals());
