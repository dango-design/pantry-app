// Safety invariants from the build plan, checked over many generated inputs.

import { describe, expect, it } from 'vitest';

import type { AllergenTerm, Dictionary, ProductRecord, Profile } from '../src/types.ts';
import { evaluate } from '../src/engine.ts';
import { dictionary, profile, rec } from './helpers.ts';

// Small deterministic random generator so failures reproduce.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const WORDS = [
  'sugar', 'salt', 'water', 'whey', 'wheat flour', 'rice flour', 'soybean oil', 'peanuts', 'almonds', 'natural flavors',
  'cocoa butter', 'milk', 'eggs', 'sesame seeds', 'shrimp', 'cod', 'corn syrup', 'citric acid', 'spices', 'lecithin',
  'coconut', 'oats', 'barley malt', 'tahini', 'cashews', 'soy lecithin', 'butter', 'cream of tartar', 'nutmeg',
];
const STATEMENTS = ['', ' Contains: milk.', ' May contain peanuts.', ' Made in a facility that also processes tree nuts.', ' Contains: wheat, soy.'];
const ALLERGENS = ['milk', 'egg', 'peanut', 'tree_nut', 'wheat', 'soy', 'fish', 'shellfish', 'sesame', 'gluten', 'mustard', 'coconut'];

function randomText(r: () => number): string {
  const n = 1 + Math.floor(r() * 8);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    let w = WORDS[Math.floor(r() * WORDS.length)]!;
    if (r() < 0.2) w = `${w} (${WORDS[Math.floor(r() * WORDS.length)]!}, ${WORDS[Math.floor(r() * WORDS.length)]!})`;
    parts.push(w);
  }
  return parts.join(', ') + '.' + STATEMENTS[Math.floor(r() * STATEMENTS.length)]!;
}

function randomProfile(r: () => number, i: number): Profile {
  const picks = ALLERGENS.filter(() => r() < 0.25);
  return profile(`P${i}`, picks.map((a) => ({ allergenId: a, severity: r() < 0.5 ? 'severe' : 'mild', avoidMayContain: r() < 0.5 })));
}

describe('invariants', () => {
  it('missing ingredient data never yields green', () => {
    const r = rng(1);
    for (let i = 0; i < 300; i++) {
      const records: ProductRecord[] = [
        rec(r() < 0.5 ? null : '', { containsStatement: r() < 0.3 ? 'Contains: milk' : null, mayContainStatement: r() < 0.3 ? 'May contain soy' : null }),
      ];
      const res = evaluate({ records, profiles: [randomProfile(r, i), profile('Empty', [])], dictionary });
      for (const p of res.profiles) expect(p.verdict).not.toBe('green');
      expect(res.overall).not.toBe('green');
    }
  });

  it('adding an allergen term never turns red into green or touches other allergens', () => {
    const r = rng(2);
    const allergenIds = dictionary.allergens.map((a) => a.id);
    for (let i = 0; i < 200; i++) {
      const records = [rec(randomText(r))];
      const profiles = [randomProfile(r, i), randomProfile(r, i + 1000)];
      const before = evaluate({ records, profiles, dictionary });
      const extra: AllergenTerm = {
        id: `test:${i}`,
        allergenId: allergenIds[Math.floor(r() * allergenIds.length)]!,
        term: WORDS[Math.floor(r() * WORDS.length)]!,
        matchType: 'word',
        strength: r() < 0.5 ? 'definite' : 'possible',
        scope: 'any',
        sourceUrl: 'https://example.org/test',
        reviewed: true,
        addedBy: 'human',
      };
      const bigger: Dictionary = { ...dictionary, terms: [...dictionary.terms, extra] };
      const after = evaluate({ records, profiles, dictionary: bigger });
      const label = `term ${extra.term}->${extra.allergenId} on "${records[0]!.ingredientsText}"`;
      after.profiles.forEach((p, k) => {
        const b = before.profiles[k]!;
        if (b.verdict === 'red') expect(p.verdict, label).not.toBe('green');
        if (b.verdict !== 'green') expect(p.verdict, label).not.toBe('green');
      });
      // No allergen loses its signal entirely; other allergens are untouched.
      const allergensBefore = new Set(before.signals.map((s) => s.allergenId));
      const allergensAfter = new Set(after.signals.map((s) => s.allergenId));
      for (const a of allergensBefore) expect(allergensAfter.has(a), label).toBe(true);
      // Allergens that include the new term's allergen (gluten includes wheat) may gain signals too.
      const touched = new Set([extra.allergenId, ...dictionary.allergens.filter((a) => a.includes?.includes(extra.allergenId)).map((a) => a.id)]);
      const others = (sig: typeof before.signals) =>
        sig.filter((s) => !touched.has(s.allergenId)).map((s) => `${s.allergenId}|${s.signal}|${s.evidenceText}`).sort();
      expect(others(after.signals), label).toEqual(others(before.signals));
    }
  });

  it('the same input always gives the same output', () => {
    const r = rng(3);
    for (let i = 0; i < 50; i++) {
      const records = [rec(randomText(r))];
      const profiles = [randomProfile(r, i)];
      expect(evaluate({ records, profiles, dictionary })).toEqual(evaluate({ records, profiles, dictionary }));
    }
  });

  it('every non-green verdict has at least one reason with a message', () => {
    const r = rng(4);
    for (let i = 0; i < 200; i++) {
      const res = evaluate({ records: [rec(randomText(r))], profiles: [randomProfile(r, i)], dictionary });
      for (const p of res.profiles) {
        if (p.verdict !== 'green') {
          expect(p.reasons.length).toBeGreaterThan(0);
          expect(p.reasons.every((x) => x.message.length > 0)).toBe(true);
        }
      }
    }
  });
});
