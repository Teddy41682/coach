#!/usr/bin/env python3
"""Which ingredients his recipes use most — the order the knowledge pack is researched and built in.

Usage: python3 tools/role_frequency.py <d1-json> [--out <dir>]
  <d1-json>: the output of `wrangler d1 execute cookbook --remote --json --command "SELECT data FROM recipes WHERE
  cookbook_slug = '<box>'"` (SELECT only). Writes recipes.json (as the coach reads them, CoachBridge.swift) and
  frequency.md to --out, which must be outside git: the recipes are his, the coach repo is public.
"""
import argparse, collections, json, pathlib, re

PREP = r"\b(chopped|minced|diced|sliced|sifted|softened|melted|divided|room temperature|large|small|medium|fresh|" \
       r"finely|roughly|packed|plus more|for serving|optional|to taste|boneless|skinless|unsalted|salted|pure)\b"


def normalise(item):
    s = re.sub(r"\(.*?\)", "", item.lower())
    s = re.sub(PREP, "", s.split(",")[0])
    s = re.sub(r"[^a-z &-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return re.sub(r"(?<=[a-z]{3})s$", "", s)


def coach_recipe(d):
    items = [i for g in d.get("ingredients") or [] for i in g.get("items") or []]
    return {
        "title": d.get("title", ""),
        "ingredients": [{"amount": " ".join(x for x in (i.get("quantity"), i.get("unit")) if x).strip(), "item": i.get("item", "")}
                        for i in items],
        "steps": [s for part in d.get("method") or [] for s in part.get("steps") or [] if s.strip()],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("d1json", type=pathlib.Path)
    ap.add_argument("--out", type=pathlib.Path, default=pathlib.Path.home() / "coach-recordings/exam-private")
    a = ap.parse_args()
    rows = json.loads(a.d1json.read_text())[0]["results"]
    recipes = [coach_recipe(json.loads(r["data"])) for r in rows]
    counts = collections.Counter(n for r in recipes for n in {normalise(i["item"]) for i in r["ingredients"]} if n)
    a.out.mkdir(parents=True, exist_ok=True)
    (a.out / "recipes.json").write_text(json.dumps(recipes, indent=1))
    lines = [f"# Ingredient frequency — {len(recipes)} recipes", "", "| item | recipes |", "|---|---:|"]
    lines += [f"| {k} | {v} |" for k, v in counts.most_common(120)]
    (a.out / "frequency.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:30]))


if __name__ == "__main__":
    main()
