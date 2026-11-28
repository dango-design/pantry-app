// Real US labels from Open Food Facts, labeled by hand from FDA rules (fixtures/labels/README.md).
// The engine must never be less cautious than the hand label. It may be more cautious; every such case
// is listed in EXTRA_CAUTION with the reason, so a new one fails the test until someone looks at it.

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { deriveProductSignals, evaluate, strongestByAllergen } from '../src/engine.ts';
import type { Signal } from '../src/types.ts';
import { US_MAJORS, dictionary, loadJson, profile, rec } from './helpers.ts';

type Expected = 'contains' | 'may_contain' | 'possible' | 'none';
interface LabelFixture {
  id: string;
  name: string;
  gtin: string;
  ingredientsText: string;
  containsStatement: string | null;
  mayContainStatement: string | null;
  expected: Record<(typeof US_MAJORS)[number], Expected>;
  notes: string;
}

const dir = fileURLToPath(new URL('../../../fixtures/labels/', import.meta.url));
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => loadJson<LabelFixture>(`${dir}${f}`));

const RANK: Record<Expected, number> = { none: 0, possible: 1, may_contain: 2, contains: 3 };

/**
 * Terms that are deliberately more cautious than the hand labels. When every engine signal behind an
 * extra flag comes from one of these, the extra flag is accepted.
 */
const ACCEPTED_TERMS: Record<string, string> = {
  'egg:lecithin': 'FARE lists lecithin as a food that sometimes contains egg.',
  'wheat:soy-sauce': 'FARE lists soy sauce as sometimes containing wheat; tamari usually has none.',
  'peanut:nuts': '"Other nuts" or plain "nuts" may include peanuts.',
};

/** fixture id -> allergen -> engine value, for one-off cases where the engine is more cautious. */
const EXTRA_CAUTION: Record<string, Partial<Record<string, { engine: Signal; why: string }>>> = {
  'off-0715166044187': { wheat: { engine: 'contains', why: '"yam flour": plain "flour" is wheat unless a reviewed guard says otherwise.' } },
};

function engineSignals(f: LabelFixture) {
  return deriveProductSignals(
    [rec(f.ingredientsText, { source: 'off', containsStatement: f.containsStatement, mayContainStatement: f.mayContainStatement })],
    dictionary,
  );
}

describe('label fixtures', () => {
  it('has at least 50 fixtures covering every allergen as contains', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(50);
    for (const a of US_MAJORS) expect(fixtures.filter((f) => f.expected[a] === 'contains').length, a).toBeGreaterThanOrEqual(3);
  });

  const misses: string[] = [];
  const extras: string[] = [];
  for (const f of fixtures) {
    it(`${f.name} (${f.id})`, () => {
      const signals = engineSignals(f);
      const got = strongestByAllergen(signals);
      for (const a of US_MAJORS) {
        const want = f.expected[a];
        const have = (got.get(a) ?? 'none') as Expected;
        if (RANK[have] < RANK[want]) misses.push(`${f.id} ${a}: expected ${want}, engine ${have}`);
        else if (RANK[have] > RANK[want]) {
          const extraSignals = signals.filter((s) => s.allergenId === a && RANK[s.signal as Expected] > RANK[want]);
          const byTerm = extraSignals.every((s) => s.termId && ACCEPTED_TERMS[s.termId]);
          const allowed = EXTRA_CAUTION[f.id]?.[a];
          if (!byTerm && (!allowed || allowed.engine !== have)) extras.push(`${f.id} ${a}: expected ${want}, engine ${have}`);
        }
      }
      expect(misses.filter((m) => m.startsWith(f.id)), 'engine missed an allergen').toEqual([]);
      expect(extras.filter((m) => m.startsWith(f.id)), 'engine more cautious than the label without a listed reason').toEqual([]);
    });
  }

  it('verdicts follow the rules table for a profile of each allergen', () => {
    for (const f of fixtures) {
      for (const a of US_MAJORS) {
        const r = evaluate({
          records: [rec(f.ingredientsText, { source: 'off', containsStatement: f.containsStatement, mayContainStatement: f.mayContainStatement })],
          profiles: [profile('P', [{ allergenId: a, severity: 'severe' }])],
          dictionary,
        });
        const want = f.expected[a];
        if (want === 'contains' || want === 'may_contain') expect(r.overall, `${f.id} ${a}`).toBe('red');
        if (want === 'possible') expect(['yellow', 'red'], `${f.id} ${a}`).toContain(r.overall);
      }
    }
  });
});
