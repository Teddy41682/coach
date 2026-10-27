import { describe, expect, it } from "vitest";
import { ControlFilter } from "../src/control";

function run(...chunks: string[]) {
  const f = new ControlFilter();
  const spoken = chunks.map((c) => f.push(c)).join("");
  const end = f.end();
  return { spoken: spoken + end.speak, action: end.action };
}

describe("ControlFilter", () => {
  it("strips a trailing [[next]] and reports it", () => {
    expect(run("Looks well drained. ", "Next up, the bowl.\n[[next]]")).toEqual({ spoken: "Looks well drained. Next up, the bowl.\n", action: "next" });
  });
  it("defaults to stay when there's no control line", () => {
    expect(run("Tilt the can toward me.")).toEqual({ spoken: "Tilt the can toward me.", action: "stay" });
  });
  it("never speaks a control split across chunks", () => {
    const r = run("Done. [", "[ne", "xt]]");
    expect(r.spoken).toBe("Done. ");
    expect(r.action).toBe("next");
  });
  it("drops anything after the control", () => {
    expect(run("Good. [[stay]] and also")).toEqual({ spoken: "Good. ", action: "stay" });
  });
  it("is case-insensitive", () => {
    expect(run("Good. [[NEXT]]").action).toBe("next");
  });
  it("speaks a lone bracket that isn't a control", () => {
    expect(run("Use [1] cup", " of water.")).toEqual({ spoken: "Use [1] cup of water.", action: "stay" });
  });
  it("an unknown control is not spoken and counts as stay", () => {
    expect(run("Fine. [[maybe]]")).toEqual({ spoken: "Fine. ", action: "stay" });
  });
});
