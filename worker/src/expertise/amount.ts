/**
 * Amounts in code (spec 2026-10-31, Serena's expertise): every tolerance, verdict and rescue is arithmetic on these,
 * never prose the model does sums in. Anything that isn't a number ("to taste", "a splash", "a lot") is null — and
 * null always routes to the safe default (ask, or redo that part).
 */
export type Unit = "tsp" | "tbsp" | "cup" | "ml" | "l" | "g" | "kg" | "oz" | "lb" | "pinch" | "dash" | "each";
export type Amount = { value: number; unit: Unit };
export type Dim = "volume" | "mass" | "count" | "pinch";

const UNITS: [RegExp, Unit][] = [
  [/^(tsp|teaspoons?|t)$/, "tsp"],
  [/^(tbsp|tbs|tablespoons?|T)$/, "tbsp"],
  [/^(cups?|c)$/, "cup"],
  [/^(ml|millilit(re|er)s?)$/, "ml"],
  [/^(l|lit(re|er)s?)$/, "l"],
  [/^(g|grams?|gr)$/, "g"],
  [/^(kg|kilos?|kilograms?)$/, "kg"],
  [/^(oz|ounces?)$/, "oz"],
  [/^(lbs?|pounds?)$/, "lb"],
  [/^pinch(es)?$/, "pinch"],
  [/^dash(es)?$/, "dash"],
];
const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, half: 0.5,
};
const VULGAR: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

/** The first quantity and its unit in `s`; a bare number is a count ("2" eggs). Null when there is no number. */
export function parseAmount(s: string): Amount | null {
  const text = s.replace(/(\d)([a-zA-Z])/g, "$1 $2").replace(/([¼½¾⅓⅔⅛])/g, " $1 ");
  const tokens = text.split(/[\s,()]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const n = number(tokens, i);
    if (!n) continue;
    const word = tokens[n.next]?.toLowerCase().replace(/\.$/, "") ?? "";
    const unit = UNITS.find(([re]) => re.test(word) || re.test(tokens[n.next] ?? ""))?.[1];
    // "a" alone is only a number in front of a unit ("a tablespoon"), never "a splash" or "a lot".
    if (!unit && n.word) continue;
    return { value: n.value, unit: unit ?? "each" };
  }
  return null;
}

/** A number starting at tokens[i]: "1", "1.5", "1/2", "1 1/2", "1½", "½", "2-3" (the lower bound), "two". */
function number(tokens: string[], i: number): { value: number; next: number; word: boolean } | null {
  const t = tokens[i].toLowerCase();
  if (t in WORDS) return { value: WORDS[t], next: i + 1, word: true };
  if (t in VULGAR) return { value: VULGAR[t], next: i + 1, word: false };
  const range = /^(\d+(?:\.\d+)?)[-–](\d+(?:\.\d+)?)$/.exec(t);
  if (range) return { value: Number(range[1]), next: i + 1, word: false };
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac && Number(frac[2]) > 0) return { value: Number(frac[1]) / Number(frac[2]), next: i + 1, word: false };
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  let value = Number(t), next = i + 1;
  const after = tokens[next];
  if (after && after in VULGAR) { value += VULGAR[after]; next++; }
  else if (after && /^\d+\/\d+$/.test(after)) { const [a, b] = after.split("/").map(Number); if (b > 0) { value += a / b; next++; } }
  return { value, next, word: false };
}

const BASE: Record<Unit, [number, Dim]> = {
  tsp: [4.93, "volume"], tbsp: [14.79, "volume"], cup: [236.6, "volume"], ml: [1, "volume"], l: [1000, "volume"],
  g: [1, "mass"], kg: [1000, "mass"], oz: [28.35, "mass"], lb: [453.6, "mass"],
  pinch: [1, "pinch"], dash: [1, "pinch"], each: [1, "count"],
};

export function toBase(a: Amount): { value: number; dim: Dim } {
  const [k, dim] = BASE[a.unit];
  return { value: Math.round(a.value * k * 100) / 100, dim };
}

/** actual ÷ recipe, or null when they can't be compared (grams against spoons, a zero recipe amount). */
export function ratio(actual: Amount, recipe: Amount): number | null {
  const a = toBase(actual), r = toBase(recipe);
  if (a.dim !== r.dim || r.value === 0) return null;
  return a.value / r.value;
}

export function scaleAmount(a: Amount, by: number): Amount {
  return { value: a.value * by, unit: a.unit };
}

const EIGHTHS: Record<number, string> = { 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞" };

/** "¾ cup", "1½ tsp", "2¼ cups", "360 g", "2": spoons and cups to the nearest eighth, grams to 5. */
export function speakAmount(a: Amount): string {
  if (a.unit === "g" || a.unit === "ml") return `${Math.round(a.value / 5) * 5} ${a.unit}`;
  const eighths = Math.round(a.value * 8);
  const whole = Math.floor(eighths / 8), rest = eighths % 8;
  const n = `${whole || !rest ? whole : ""}${rest ? EIGHTHS[rest] : ""}` || "0";
  if (a.unit === "each") return n;
  const plural = a.value > 1 && ["cup", "pinch", "dash"].includes(a.unit) ? (a.unit === "cup" ? "cups" : `${a.unit}es`) : a.unit;
  return `${n} ${plural}`;
}
