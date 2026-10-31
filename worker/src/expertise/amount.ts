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
const VULGAR: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};
const UNIT_WORD = "(tsp|tbsp|tbs|teaspoons?|tablespoons?|cups?|ml|grams?|g|ounces?|oz|pounds?|lbs?|pinch(?:es)?|dash(?:es)?)";
const NUM_WORD: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};
const PART: Record<string, number> = { half: 0.5, quarter: 0.25, third: 1 / 3, "three quarters": 0.75 };

/**
 * Spoken amounts rewritten as numbers before parsing, so "one and a half tablespoons" is never read as ½ and "half a
 * cup" never as 1 (the final review's probes). Case matters for one thing only: a capital T is a tablespoon.
 */
function spokenToDigits(s: string): string {
  let t = s.replace(/(\d)\s*T\b/g, "$1 tbsp").replace(/(\d)\s*t\b/g, "$1 tsp").toLowerCase();
  t = t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, (w) => NUM_WORD[w]);
  t = t.replace(new RegExp(`\\b(a|an) ${UNIT_WORD}`, "g"), "1 $2");
  // "1 and a half cups", "a cup and a half" (now "1 cup and a half"), "half a cup", "a quarter cup".
  t = t.replace(/(\d+(?:\.\d+)?) and (?:a |an )?(half|quarter|third|three quarters)\b/g, (_, n, p) => String(Number(n) + PART[p]));
  t = t.replace(new RegExp(`(\\d+(?:\\.\\d+)?) ${UNIT_WORD} and (?:a |an )?(half|quarter|third|three quarters)\\b`, "g"),
    (_, n, u, p) => `${Number(n) + PART[p]} ${u}`);
  t = t.replace(new RegExp(`\\b(?:a |an )?(half|quarter|third|three quarters)(?: of)?(?: a| an| 1)? ${UNIT_WORD}`, "g"),
    (_, p, u) => `${PART[p]} ${u}`);
  return t;
}

/** The first quantity and its unit in `s`; a bare number is a count ("2" eggs). Null when there is no number. */
export function parseAmount(s: string): Amount | null {
  const spoken = spokenToDigits(s.replace(/(\d)([a-zA-Z])/g, "$1 $2"));
  // A fraction word left over is one we couldn't place: no number beats a wrong one.
  if (/\b(half|quarter|third)\b/.test(spoken)) return null;
  const text = spoken.replace(/([¼½¾⅓⅔⅛⅜⅝⅞])/g, " $1 ");
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
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
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
  // Grams and millilitres to 5 above 100, to 1 below — 4 g of yeast is never said as 5 g, nor 1.75 g as 0 g.
  if (a.unit === "g" || a.unit === "ml") return `${a.value >= 100 ? Math.round(a.value / 5) * 5 : Math.max(1, Math.round(a.value))} ${a.unit}`;
  const eighths = Math.round(a.value * 8);
  if (eighths === 0 && a.value > 0 && ["tsp", "tbsp", "cup"].includes(a.unit)) return "a pinch";
  const whole = Math.floor(eighths / 8), rest = eighths % 8;
  const n = `${whole || !rest ? whole : ""}${rest ? EIGHTHS[rest] : ""}` || "0";
  if (a.unit === "each") return n;
  const plural = a.value > 1 && ["cup", "pinch", "dash"].includes(a.unit) ? (a.unit === "cup" ? "cups" : `${a.unit}es`) : a.unit;
  return `${n} ${plural}`;
}
