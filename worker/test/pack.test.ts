import { describe, expect, it } from "vitest";
import { PACK } from "../src/expertise/cooking-pack";
import { validatePack } from "../src/expertise/cooking-pack/validate";
import type { Pack, Role } from "../src/expertise/cooking-pack/types";

const S = ["McGee, On Food and Cooking", "Serious Eats"];
const role = (over: Partial<Role> = {}): Role => ({
  id: "flavour-extract", name: "Flavour extract", does: "flavour", tight: true,
  bands: { default: [{ below: 0.5, verdict: "fine" }, { below: 2, verdict: "fine" }, { below: 4, verdict: "fixable", rescue: "scale" }, { below: Infinity, verdict: "redo" }] },
  rescues: [{ id: "scale", kind: "scale", say: "make a bigger batch", sources: S }],
  substitutions: [], changes: [], shows: "dark streaks", sources: S, ...over,
});
const pack = (r: Role, index: Pack["index"] = { vanilla: ["flavour-extract"] }): Pack => ({ version: "t", roles: [r], index });

describe("the pack's checker", () => {
  it("passes a sound pack", () => {
    expect(validatePack(pack(role()))).toEqual([]);
  });
  it("names an unsorted band", () => {
    const r = role({ bands: { default: [{ below: 2, verdict: "fine" }, { below: 1, verdict: "redo" }, { below: Infinity, verdict: "redo" }] } });
    expect(validatePack(pack(r))).toEqual(["role flavour-extract default: bands not sorted"]);
  });
  it("names a rescue with one source that isn't provisional", () => {
    const r = role({ rescues: [{ id: "scale", kind: "scale", say: "x", sources: ["one blog"] }] });
    expect(validatePack(pack(r))).toEqual(["role flavour-extract rescue scale: fewer than 2 sources and not provisional"]);
  });
  it("names an index entry pointing at a role that doesn't exist", () => {
    expect(validatePack(pack(role(), { vanilla: ["vanilla-role"] }))).toEqual(["index vanilla: unknown role vanilla-role"]);
  });
});

describe("the shipped pack", () => {
  it("is sound", () => {
    expect(validatePack(PACK)).toEqual([]);
  });
  it("knows the common names", () => {
    expect(PACK.index["vanilla"]).toContain("flavour-extract");
    expect(PACK.index["vanilla extract"]).toContain("flavour-extract");
    expect(PACK.index["baking soda"]).toContain("chemical-leavener-base");
    expect(PACK.index["bicarbonate of soda"]).toContain("chemical-leavener-base");
    expect(PACK.index["salt"]).toContain("salt");
  });
});
