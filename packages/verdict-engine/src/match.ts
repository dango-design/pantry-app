// Finds dictionary terms in a piece of text. The longest active match wins inside its span.

import type { CompiledDictionary } from './dictionary.ts';
import type { AllergenTerm, TermScope } from './types.ts';

export interface TermMatch {
  term: AllergenTerm;
  active: boolean;
  start: number;
  end: number;
  text: string;
}

/**
 * Return the matches that survive suppression. A match is dropped when it sits inside a longer
 * active match for the same allergen: "cocoa butter" (a milk guard) hides "butter", "peanut oil"
 * hides "peanut". Matches for other allergens are never hidden, so adding a term can only add
 * signals. Inactive (unreviewed Claude) terms are reported but never hide anything.
 */
export function findTerms(text: string, compiled: CompiledDictionary, scope: TermScope): TermMatch[] {
  const all: TermMatch[] = [];
  for (const { term, re, active } of compiled.terms) {
    if (term.scope === 'statement' && scope !== 'statement') continue;
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      all.push({ term, active, start, end: start + m[0].length, text: m[0] });
    }
  }
  all.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const shields: { start: number; end: number; allergenId: string }[] = [];
  const kept: TermMatch[] = [];
  for (const m of all) {
    const hidden = shields.some(
      (s) => s.allergenId === m.term.allergenId && m.start >= s.start && m.end <= s.end && s.end - s.start > m.end - m.start,
    );
    if (hidden) continue;
    kept.push(m);
    if (m.active) shields.push({ start: m.start, end: m.end, allergenId: m.term.allergenId });
  }
  return kept.sort((a, b) => a.start - b.start);
}

export function hasVagueTerm(text: string, compiled: CompiledDictionary): string | null {
  for (const re of compiled.vague) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}
