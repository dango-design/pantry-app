// Builds a Dictionary from the compact JSON files in data/ and compiles term patterns.

import { normalizeText } from './normalize.ts';
import type {
  Allergen,
  AllergenTerm,
  Dictionary,
  MatchType,
  Signal,
  TermAddedBy,
  TermScope,
  TermStrength,
} from './types.ts';

/** A term inside a group: a plain string, or an object when it needs options. */
export type CompactTerm =
  | string
  | {
      term: string;
      matchType?: MatchType;
      scope?: TermScope;
      note?: string;
      /** Override the group's allergens: one phrase can signal several allergens. */
      allergenIds?: string[];
      strength?: TermStrength;
    };

export interface TermGroup {
  allergenIds: string[];
  strength: TermStrength;
  scope?: TermScope;
  sourceUrl: string | null;
  addedBy: TermAddedBy;
  reviewed: boolean;
  note?: string;
  terms: CompactTerm[];
}

export interface CompactDictionary {
  version: string;
  allergens: Allergen[];
  groups: TermGroup[];
  advisoryPhrases: string[];
  vagueTerms: string[];
  offTagMap: Record<string, { allergenId: string; signal?: Signal }[]>;
}

export function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Expand grouped terms into one row per (allergen, term). Row ids are stable. */
export function expandDictionary(compact: CompactDictionary): Dictionary {
  const terms: AllergenTerm[] = [];
  const seen = new Set<string>();
  for (const group of compact.groups) {
    for (const t of group.terms) {
      const spec = typeof t === 'string' ? { term: t } : t;
      const allergenIds = spec.allergenIds ?? group.allergenIds;
      for (const allergenId of allergenIds) {
        const id = `${allergenId}:${slug(spec.term)}`;
        if (seen.has(id)) throw new Error(`Duplicate dictionary term ${id}`);
        seen.add(id);
        const row: AllergenTerm = {
          id,
          allergenId,
          // Regex terms keep their case: \p{L} is not \p{l}.
          term: spec.matchType === 'regex' ? spec.term : spec.term.toLowerCase(),
          matchType: spec.matchType ?? 'word',
          strength: spec.strength ?? group.strength,
          scope: spec.scope ?? group.scope ?? 'any',
          sourceUrl: group.sourceUrl,
          reviewed: group.reviewed,
          addedBy: group.addedBy,
        };
        const note = spec.note ?? group.note;
        if (note) row.note = note;
        terms.push(row);
      }
    }
  }
  return {
    version: compact.version,
    allergens: compact.allergens,
    terms,
    advisoryPhrases: compact.advisoryPhrases,
    vagueTerms: compact.vagueTerms,
    offTagMap: compact.offTagMap,
  };
}

/**
 * A term is active when it came from a cited source or a person reviewed it.
 * Terms Claude added count only as "possible" and never hide other matches until reviewed.
 */
export function isActive(term: AllergenTerm): boolean {
  return term.reviewed || term.addedBy !== 'claude';
}

export function effectiveStrength(term: AllergenTerm): TermStrength {
  if (term.strength === 'none') return 'none';
  return isActive(term) ? term.strength : 'possible';
}

/** Problems that must stop a dictionary from shipping. */
export function validateDictionary(dict: Dictionary): string[] {
  const problems: string[] = [];
  const allergenIds = new Set(dict.allergens.map((a) => a.id));
  for (const a of dict.allergens) {
    for (const inc of a.includes ?? []) if (!allergenIds.has(inc)) problems.push(`${a.id} includes unknown ${inc}`);
  }
  for (const t of dict.terms) {
    if (!allergenIds.has(t.allergenId)) problems.push(`${t.id}: unknown allergen`);
    // The build plan: no allergen_terms row ships without a source_url.
    if (!t.sourceUrl) problems.push(`${t.id}: no source_url`);
    if (t.matchType === 'regex') {
      try {
        new RegExp(t.term, 'u');
      } catch {
        problems.push(`${t.id}: bad regex`);
      }
    }
  }
  for (const p of dict.advisoryPhrases) {
    try {
      new RegExp(p, 'u');
    } catch {
      problems.push(`advisory phrase is not a valid pattern: ${p}`);
    }
  }
  return problems;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const L = '\\p{L}\\p{N}';

/** Compile a term to a global, unicode regex. Word terms allow a plural "s"/"es" and flexible spaces or hyphens. */
export function compileTerm(term: AllergenTerm): RegExp {
  if (term.matchType === 'regex') return new RegExp(term.term, 'gu');
  const body = normalizeText(term.term)
    .split(/[\s-]+/)
    .map((w) => escapeRegex(w).replace(/'/g, "'?"))
    .join('[\\s-]+');
  if (term.matchType === 'exact') return new RegExp(`^${body}$`, 'gu');
  return new RegExp(`(?<![${L}])${body}(?:s|es)?(?![${L}])`, 'gu');
}

export interface CompiledDictionary {
  dict: Dictionary;
  terms: { term: AllergenTerm; re: RegExp; active: boolean }[];
  advisory: RegExp[];
  vague: RegExp[];
  includedBy: Map<string, string[]>;
  allergenById: Map<string, Allergen>;
}

const cache = new WeakMap<Dictionary, CompiledDictionary>();

export function compileDictionary(dict: Dictionary): CompiledDictionary {
  const hit = cache.get(dict);
  if (hit) return hit;
  const includedBy = new Map<string, string[]>();
  for (const a of dict.allergens) {
    for (const inc of a.includes ?? []) {
      const list = includedBy.get(inc) ?? [];
      list.push(a.id);
      includedBy.set(inc, list);
    }
  }
  const compiled: CompiledDictionary = {
    dict,
    terms: dict.terms.map((term) => ({ term, re: compileTerm(term), active: isActive(term) })),
    advisory: dict.advisoryPhrases.map((p) => new RegExp(p, 'gu')),
    vague: dict.vagueTerms.map(
      (v) =>
        new RegExp(
          `(?<![${L}])${v
            .split(/\s+/)
            .map(escapeRegex)
            .join('[\\s-]+')}(?:s|es)?(?![${L}])`,
          'u',
        ),
    ),
    includedBy,
    allergenById: new Map(dict.allergens.map((a) => [a.id, a])),
  };
  cache.set(dict, compiled);
  return compiled;
}
