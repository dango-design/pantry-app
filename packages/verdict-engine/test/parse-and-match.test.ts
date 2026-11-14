import { describe, expect, it } from 'vitest';

import { validateDictionary } from '../src/dictionary.ts';
import { deriveProductSignals, evaluate, strongestByAllergen } from '../src/engine.ts';
import { expandUpcE, normalizeGtin } from '../src/gtin.ts';
import { parseIngredientTree, walk } from '../src/parse.ts';
import { US_MAJORS, dataPath, dictionary, loadJson, profile, rec } from './helpers.ts';

const strongest = (text: string, extra = {}) => strongestByAllergen(deriveProductSignals([rec(text, extra)], dictionary));

describe('dictionary', () => {
  it('passes validation: every term has a source or is a flagged Claude term', () => {
    expect(validateDictionary(dictionary)).toEqual([]);
  });

  it('every Claude-added term ships unreviewed', () => {
    const bad = dictionary.terms.filter((t) => t.addedBy === 'claude' && t.reviewed);
    expect(bad).toEqual([]);
  });

  it('has the 9 US majors', () => {
    const majors = dictionary.allergens.filter((a) => a.isUsMajor).map((a) => a.id).sort();
    expect(majors).toEqual([...US_MAJORS].sort());
  });

  it('guards (strength none) produce no signal and hide only their own allergen', () => {
    const s = strongest('cocoa butter, almond milk, rice flour, soy lecithin');
    expect(s.get('milk')).toBeUndefined();
    expect(s.get('wheat')).toBeUndefined();
    expect(s.get('egg')).toBeUndefined();
    expect(s.get('tree_nut')).toBe('contains');
    expect(s.get('soy')).toBe('contains');
  });

  it('a guard for wheat does not hide gluten in "barley flour"', () => {
    const s = strongest('barley flour');
    expect(s.get('wheat')).toBeUndefined();
    expect(s.get('gluten')).toBe('contains');
  });

  it('unreviewed Claude guards hide nothing', () => {
    expect(strongest('hemp milk').get('milk')).toBe('contains');
  });
});

describe('ingredient tree', () => {
  it('keeps sub-ingredients under their parent', () => {
    const { nodes } = parseIngredientTree('sugar, chocolate (sugar, cocoa butter, milk), salt');
    expect(nodes.map((n) => n.text)).toEqual(['sugar', 'chocolate', 'salt']);
    expect(nodes[1]!.children.map((n) => n.text)).toEqual(['sugar', 'cocoa butter', 'milk']);
  });

  it('handles nested brackets and text after a bracket', () => {
    const { nodes, warnings } = parseIngredientTree('cookie (flour [wheat, niacin], sugar) pieces, salt');
    expect(warnings).toEqual([]);
    expect(nodes[0]!.text).toBe('cookie pieces');
    expect(nodes[0]!.children[0]!.children.map((n) => n.text)).toEqual(['wheat', 'niacin']);
  });

  it('marks oil sources in "X, Y, and/or Z oil" runs and under an oil parent', () => {
    const { nodes } = parseIngredientTree('salt, corn, soybean, and/or canola oil, vegetable oil (peanut, sunflower)');
    const byText = new Map([...walk(nodes)].map((n) => [n.text, n]));
    expect(byText.get('salt')!.oilContext).toBeFalsy();
    expect(byText.get('soybean')!.oilContext).toBe(true);
    expect(byText.get('peanut')!.oilContext).toBe(true);
  });
});

describe('matching', () => {
  it('reads oil sources as oils (possible), not the bean itself (contains)', () => {
    expect(strongest('corn, soybean, and/or canola oil').get('soy')).toBe('possible');
    expect(strongest('vegetable oil (soybean, canola)').get('soy')).toBe('possible');
    expect(strongest('partially hydrogenated soybean and cottonseed oil').get('soy')).toBe('possible');
    expect(strongest('soybeans, salt').get('soy')).toBe('contains');
  });

  it('cold-pressed peanut oil is definite; plain peanut oil is possible', () => {
    expect(strongest('cold-pressed peanut oil').get('peanut')).toBe('contains');
    expect(strongest('peanut oil').get('peanut')).toBe('possible');
  });

  it('matches plurals, hyphens and accents', () => {
    expect(strongest('almonds, pecans').get('tree_nut')).toBe('contains');
    expect(strongest('half and half').get('milk')).toBe('contains');
    expect(strongest('piñon nuts').get('tree_nut')).toBe('contains');
  });

  it('plain "flour" is wheat; other grain flours are not', () => {
    expect(strongest('enriched flour (niacin)').get('wheat')).toBe('contains');
    expect(strongest('rice flour, corn flour, tapioca flour').get('wheat')).toBeUndefined();
  });

  it('soy lecithin is soy and not egg; plain lecithin is possible for both', () => {
    const a = strongest('soy lecithin');
    expect(a.get('soy')).toBe('contains');
    expect(a.get('egg')).toBeUndefined();
    const b = strongest('lecithin');
    expect(b.get('soy')).toBe('possible');
    expect(b.get('egg')).toBe('possible');
  });

  it('crustaceans are shellfish; molluscs are not', () => {
    expect(strongest('shrimp').get('shellfish')).toBe('contains');
    expect(strongest('clams, squid').get('shellfish')).toBeUndefined();
    expect(strongest('clams, squid').get('mollusc')).toBe('contains');
  });

  it('coconut is not a tree nut unless the label says so', () => {
    expect(strongest('coconut, sugar').get('tree_nut')).toBeUndefined();
    expect(strongest('coconut, sugar').get('coconut')).toBe('contains');
    expect(strongest('coconut, sugar. contains: tree nuts (coconut).').get('tree_nut')).toBe('contains');
  });

  it('does not read "contains 2% or less of" as an allergen statement', () => {
    const r = deriveProductSignals([rec('water, contains 2% or less of: salt, whey, soy lecithin')], dictionary);
    expect(r.some((s) => s.ruleId === 'contains_statement')).toBe(false);
    expect(strongestByAllergen(r).get('milk')).toBe('contains');
  });

  it('unreviewed Claude terms count only as possible', () => {
    const r = deriveProductSignals([rec('carp, salt')], dictionary);
    const s = r.find((x) => x.allergenId === 'fish');
    expect(s?.signal).toBe('possible');
    expect(s?.termReviewed).toBe(false);
    const v = evaluate({ records: [rec('carp, salt')], profiles: [profile('Sam', ['fish'])], dictionary });
    expect(v.profiles[0]!.summary).toBe('Check: carp (unreviewed term)');
  });
});

describe('known false positives', () => {
  const words = ['cocoa butter', 'nutmeg', 'water chestnut', 'eggplant', 'buckwheat', 'cream of tartar'];
  for (const w of words) {
    it(`"${w}" flags no milk, tree nut, egg or wheat`, () => {
      const s = strongest(`sugar, ${w}, salt`);
      for (const a of ['milk', 'tree_nut', 'egg', 'wheat']) expect(s.get(a), `${w} -> ${a}`).toBeUndefined();
    });
  }
  it('FARE "does not contain milk" words stay clear', () => {
    const s = strongest('calcium lactate, sodium lactate, lactic acid, sodium stearoyl lactylate, calcium stearoyl lactylate');
    expect(s.get('milk')).toBeUndefined();
  });
});

describe('advisory statements', () => {
  const { samples } = loadJson<{ samples: { text: string; allergens: string[] }[] }>(dataPath('advisory-samples.json'));
  for (const sample of samples) {
    it(`detects: ${sample.text}`, () => {
      const signals = deriveProductSignals([rec(`rice, sugar. ${sample.text}`)], dictionary);
      for (const a of sample.allergens) {
        const s = signals.find((x) => x.allergenId === a && x.ruleId === 'may_contain_statement');
        expect(s?.signal, `${a} in "${sample.text}"`).toBe('may_contain');
      }
      // Advisory allergens must never be reported as contained.
      expect(signals.filter((x) => x.signal === 'contains')).toEqual([]);
    });
  }
  it('"peanut-free facility" is not a precautionary statement', () => {
    const signals = deriveProductSignals([rec('rice, sugar. made in a peanut-free facility.')], dictionary);
    expect(signals.filter((s) => s.ruleId === 'may_contain_statement')).toEqual([]);
  });
});

describe('gtin', () => {
  it('normalizes UPC-A, EAN-13, EAN-8 and UPC-E to 14 digits', () => {
    expect(normalizeGtin('044000032029')?.gtin14).toBe('00044000032029');
    expect(normalizeGtin('4006381333931')?.gtin14).toBe('04006381333931');
    expect(normalizeGtin('96385074', 'ean8')?.gtin14).toBe('00000096385074');
    expect(expandUpcE('04252614')).toBe('042100005264');
    expect(normalizeGtin('04252614', 'upc_e')?.gtin14).toBe('00042100005264');
  });
  it('checks the check digit', () => {
    expect(normalizeGtin('044000032029')?.valid).toBe(true);
    expect(normalizeGtin('044000032028')?.valid).toBe(false);
  });
  it('spots restricted-circulation (in-store) barcodes', () => {
    expect(normalizeGtin('212345012347')?.restrictedCirculation).toBe(true);
    expect(normalizeGtin('412345678903')?.restrictedCirculation).toBe(true);
    expect(normalizeGtin('044000032029')?.restrictedCirculation).toBe(false);
  });
});
