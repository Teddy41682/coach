import { describe, expect, it } from "vitest";
import { parseAmount, ratio, scaleAmount, speakAmount, toBase } from "../src/expertise/amount";

describe("amounts in code", () => {
  it("parses the amounts recipes and cooks use", () => {
    expect(parseAmount("1 tsp")).toEqual({ value: 1, unit: "tsp" });
    expect(parseAmount("1½ cups (190 g) flour, sifted")).toEqual({ value: 1.5, unit: "cup" });
    expect(parseAmount("1 1/2 tbsp")).toEqual({ value: 1.5, unit: "tbsp" });
    expect(parseAmount("1/4 cup")).toEqual({ value: 0.25, unit: "cup" });
    expect(parseAmount("2-3 tbsp")).toEqual({ value: 2, unit: "tbsp" });
    expect(parseAmount("a tablespoon")).toEqual({ value: 1, unit: "tbsp" });
    expect(parseAmount("about two teaspoons")).toEqual({ value: 2, unit: "tsp" });
    expect(parseAmount("1.5 lb")).toEqual({ value: 1.5, unit: "lb" });
    expect(parseAmount("715g")).toEqual({ value: 715, unit: "g" });
    expect(parseAmount("2")).toEqual({ value: 2, unit: "each" });
    expect(parseAmount("a pinch")).toEqual({ value: 1, unit: "pinch" });
  });
  it("gives null for what isn't a number, and never throws", () => {
    expect(parseAmount("to taste")).toBeNull();
    expect(parseAmount("a splash")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("a lot")).toBeNull();
  });
  it("converts to base units", () => {
    expect(toBase({ value: 1, unit: "tbsp" })).toEqual({ value: 14.79, dim: "volume" });
    expect(toBase({ value: 1, unit: "lb" })).toEqual({ value: 453.6, dim: "mass" });
  });
  it("compares only like with like", () => {
    expect(ratio({ value: 1, unit: "tbsp" }, { value: 1, unit: "tsp" })).toBeCloseTo(3, 1);
    expect(ratio({ value: 0, unit: "tsp" }, { value: 1, unit: "tsp" })).toBe(0);
    expect(ratio({ value: 10, unit: "g" }, { value: 1, unit: "tsp" })).toBeNull();
    expect(ratio({ value: 3, unit: "each" }, { value: 2, unit: "each" })).toBe(1.5);
  });
  it("says amounts the way a cook would", () => {
    expect(speakAmount({ value: 0.75, unit: "cup" })).toBe("¾ cup");
    expect(speakAmount({ value: 1.5, unit: "tsp" })).toBe("1½ tsp");
    expect(speakAmount({ value: 2.25, unit: "cup" })).toBe("2¼ cups");
    expect(speakAmount({ value: 1, unit: "each" })).toBe("1");
    expect(speakAmount({ value: 357.5, unit: "g" })).toBe("360 g");
    expect(speakAmount(scaleAmount({ value: 1, unit: "cup" }, 0.5))).toBe("½ cup");
  });
});
