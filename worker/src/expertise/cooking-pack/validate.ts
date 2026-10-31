import { KINDS, type Pack } from "./types";

/**
 * Everything wrong with a pack, one line each; empty when it's sound. Run by the tests on the shipped pack, so a
 * pack that would let the coach improvise (an unsourced rescue, a band that never ends) never deploys.
 */
export function validatePack(p: Pack): string[] {
  const errors: string[] = [];
  const ids = new Set(p.roles.map((r) => r.id));
  const sourced = (what: string, sources: string[], provisional?: boolean) => {
    if (!provisional && sources.length < 2) errors.push(`${what}: fewer than 2 sources and not provisional`);
  };
  for (const r of p.roles) {
    sourced(`role ${r.id}`, r.sources, r.provisional);
    if (!r.bands.default) errors.push(`role ${r.id}: no default bands`);
    const rescueIds = new Set(r.rescues.map((x) => x.id));
    for (const [kind, bands] of Object.entries(r.bands)) {
      if (kind !== "default" && !KINDS.includes(kind as never)) errors.push(`role ${r.id}: unknown kind ${kind}`);
      if (!bands?.length) { errors.push(`role ${r.id} ${kind}: no bands`); continue; }
      if (bands.some((b, i) => i > 0 && b.below <= bands[i - 1].below)) errors.push(`role ${r.id} ${kind}: bands not sorted`);
      if (bands[bands.length - 1].below !== Infinity) errors.push(`role ${r.id} ${kind}: last band must reach Infinity`);
      for (const b of bands) {
        if (b.rescue && !rescueIds.has(b.rescue)) errors.push(`role ${r.id} ${kind}: rescue ${b.rescue} not defined`);
        if (b.verdict === "fixable" && !b.rescue) errors.push(`role ${r.id} ${kind}: a fixable band without a rescue`);
      }
    }
    for (const x of r.rescues) {
      sourced(`role ${r.id} rescue ${x.id}`, x.sources, x.provisional);
      if (x.add && !ids.has(x.add.role)) errors.push(`role ${r.id} rescue ${x.id}: adds unknown role ${x.add.role}`);
    }
    r.substitutions.forEach((s, i) => sourced(`role ${r.id} substitution ${i} (${s.use})`, s.sources, s.provisional));
    r.changes.forEach((c, i) => {
      sourced(`role ${r.id} change ${i} (${c.direction})`, c.sources, c.provisional);
      if (!(c.upTo > 0 && c.upTo <= 2)) errors.push(`role ${r.id} change ${i} (${c.direction}): upTo ${c.upTo} is not a fraction of the recipe amount (0 < upTo ≤ 2)`);
    });
  }
  for (const [alias, name] of Object.entries(p.aliases)) {
    if (!p.index[name]) errors.push(`alias ${alias}: ${name} is not in the index`);
  }
  for (const [item, roles] of Object.entries(p.index)) {
    for (const id of roles) if (!ids.has(id)) errors.push(`index ${item}: unknown role ${id}`);
  }
  return errors;
}
