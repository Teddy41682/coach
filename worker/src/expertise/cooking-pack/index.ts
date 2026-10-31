import type { Pack, Role } from "./types";
import * as A from "./roles/a-seasoning-acids-sweeteners";
import * as B from "./roles/b-eggs-fats-dairy";
import * as C from "./roles/c-leaveners-flours-thickeners";
import * as D from "./roles/d-proteins-liquids-heat";

/**
 * The cooking knowledge pack the coach ships with. Roles live one research group to a file under `roles/`, encoded
 * from the sourced notes in docs/research/expertise/ (each rule cites ≥ 2 trusted sources or is provisional).
 * `validatePack` runs on it in the tests.
 */
const GROUPS = [A, B, C, D];
const ROLES: Role[] = GROUPS.flatMap((g) => g.ROLES);

/** Each normalised ingredient name → the roles it fills, merged across groups. */
const INDEX: Record<string, string[]> = {};
for (const g of GROUPS) for (const [item, ids] of Object.entries(g.INDEX)) INDEX[item] = [...new Set([...(INDEX[item] ?? []), ...ids])];

/** Other names for the same ingredient → its indexed name. */
const ALIASES: Record<string, string> = Object.assign({}, ...GROUPS.map((g) => g.ALIASES));

export const PACK: Pack = { version: "2026-10-31", roles: ROLES, index: INDEX, aliases: ALIASES };
