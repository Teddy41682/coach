import type { Pack, Role } from "./types";

/**
 * The cooking knowledge pack the coach ships with. Roles live one group to a file under `roles/`, each rule with its
 * sources (research notes: docs/research/expertise/). `validatePack` runs on it in the tests.
 */
const ROLES: Role[] = [];

/** Each role's items and aliases, normalised (lookup.ts `normaliseItem`), → the roles they fill. */
const INDEX: Record<string, string[]> = {};

export const PACK: Pack = { version: "2026-10-31", roles: ROLES, index: INDEX };
