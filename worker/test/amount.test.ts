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
  it("reads spoken fractions whole, and a capital T is a tablespoon (the final review's probes)", () => {
    expect(parseAmount("1 T sugar")).toEqual({ value: 1, unit: "tbsp" });
    expect(parseAmount("1 t salt")).toEqual({ value: 1, unit: "tsp" });
    expect(parseAmount("half a cup")).toEqual({ value: 0.5, unit: "cup" });
    expect(parseAmount("half a teaspoon")).toEqual({ value: 0.5, unit: "tsp" });
    expect(parseAmount("one and a half cups")).toEqual({ value: 1.5, unit: "cup" });
    expect(parseAmount("one and a half tablespoons")).toEqual({ value: 1.5, unit: "tbsp" });
    expect(parseAmount("a cup and a half")).toEqual({ value: 1.5, unit: "cup" });
    expect(parseAmount("a teaspoon and a half")).toEqual({ value: 1.5, unit: "tsp" });
    expect(parseAmount("two and a quarter cups")).toEqual({ value: 2.25, unit: "cup" });
    expect(parseAmount("1⅜ cups")).toEqual({ value: 1.375, unit: "cup" });
    expect(parseAmount(".5 cup")).toEqual({ value: 0.5, unit: "cup" });
    // A lone t is a teaspoon only after a number — not the t of "don't" or "can't".
    expect(parseAmount("I don't have 2 cups")).toEqual({ value: 2, unit: "cup" });
    expect(parseAmount("can't find it")).toBeNull();
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
    // Small amounts keep their size: no "0 g", no 4 g said as 5 g; a spoon under ⅛ is a pinch.
    expect(speakAmount({ value: 4, unit: "g" })).toBe("4 g");
    expect(speakAmount({ value: 1.75, unit: "g" })).toBe("2 g");
    expect(speakAmount({ value: 0.05, unit: "tsp" })).toBe("a pinch");
  });
});
