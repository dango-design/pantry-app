// Parsers checked against API responses recorded on 2026-11-08 (fixtures/api/README.md).

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expandDictionary, type CompactDictionary, type Profile } from '@allergy/verdict-engine';
import { describe, expect, it } from 'vitest';

import { buildChefCard, chefCardHash } from '../src/chef-card.ts';
import { offCode, usdaQueries } from '../src/fetchers.ts';
import { ingredientsHash, normalizeOffResponse, normalizeOffSearch, normalizeUsdaSearch } from '../src/products.ts';
import { extractUpcs, isoDate, matchRecall, parseFsisRecalls, parseOpenFdaEnforcement, recallAllergens } from '../src/recalls.ts';

const api = fileURLToPath(new URL('../../../fixtures/api/', import.meta.url));
const json = (p: string) => JSON.parse(readFileSync(`${api}${p}`, 'utf8'));
const dictionary = expandDictionary(
  JSON.parse(readFileSync(fileURLToPath(new URL('../../verdict-engine/data/dictionary.json', import.meta.url)), 'utf8')) as CompactDictionary,
);

describe('Open Food Facts', () => {
  it('normalizes every recorded product', () => {
    const files = readdirSync(`${api}off`).filter((f) => /^product-\d+\.json$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const p = normalizeOffResponse(json(`off/${f}`));
      expect(p, f).not.toBeNull();
      expect(p!.source).toBe('off');
      expect(p!.gtin).toMatch(/^\d{14}$/);
      expect(p!.ingredientsText?.length ?? 0).toBeGreaterThan(5);
    }
  });

  it('reads a known product correctly', () => {
    const p = normalizeOffResponse(json('off/product-0044000037451.json'))!;
    expect(p.gtin).toBe('00044000037451');
    expect(p.allergenTags).toContain('en:peanuts');
    expect(p.labelRegion).toBe('us');
    expect(p.sourceUpdatedAt).toMatch(/^20\d\d-/);
  });

  it('returns null for unknown products (status 0, and the 404 body)', () => {
    expect(normalizeOffResponse(json('off/product-notfound.json'))).toBeNull();
    expect(normalizeOffResponse(json('off/product-notfound-valid-checksum.json'))).toBeNull();
  });

  it('normalizes a search', () => {
    const products = normalizeOffSearch(json('off/search-granola.json'));
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.source === 'off')).toBe(true);
  });

  it('uses the code form OFF stores', () => {
    expect(offCode('00044000037451')).toBe('0044000037451');
    expect(offCode('00000096385074')).toBe('96385074');
    expect(offCode('04006381333931')).toBe('4006381333931');
  });
});

describe('USDA FoodData Central', () => {
  it('matches only foods whose gtinUpc equals the barcode', () => {
    const p = normalizeUsdaSearch(json('usda/search-00044000037451.json'), '00044000037451');
    expect(p?.source).toBe('usda');
    expect(p?.ingredientsText).toMatch(/peanut/i);
    expect(p?.labelRegion).toBe('us');
  });

  it('a full-text search full of unrelated foods gives no match', () => {
    expect(normalizeUsdaSearch(json('usda/search-notfound.json'), '00012345678905')).toBeNull();
  });

  it('tries the 12-digit form first, then 14 digits', () => {
    expect(usdaQueries('00044000037451')).toEqual(['044000037451', '00044000037451', '0044000037451']);
  });
});

describe('recalls', () => {
  it('parses openFDA enforcement reports', () => {
    const recalls = parseOpenFdaEnforcement(json('openfda/enforcement-allergen.json'), dictionary);
    expect(recalls.length).toBe(20);
    for (const r of recalls) {
      expect(r.agency).toBe('fda');
      expect(r.recallNumber).toBeTruthy();
      expect(r.reportDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // At least some undeclared-allergen recalls name one of our allergens.
    expect(recalls.filter((r) => r.allergensMentioned.length > 0).length).toBeGreaterThan(3);
  });

  it('a "No matches found" body gives no recalls', () => {
    expect(parseOpenFdaEnforcement(json('openfda/enforcement-empty.json'), dictionary)).toEqual([]);
  });

  it('pulls valid UPCs out of free text', () => {
    expect(extractUpcs('Jovy Gummy Worms Neon; packaged in 1lb plastic units. UPC 712199083411')).toEqual(['00712199083411']);
    expect(extractUpcs('UPC 0 44000 03745 1, lot 6156')).toEqual(['00044000037451']);
    expect(extractUpcs('UPC 712199083412 (bad check digit)')).toEqual([]);
    expect(extractUpcs('lot: 6156, best by 20261231')).toEqual([]);
  });

  it('finds allergens in recall reasons', () => {
    expect(recallAllergens('Product contains undeclared milk and soy.', dictionary)).toEqual(['milk', 'soy']);
    expect(recallAllergens('undeclared allergen ingredient (Red#40, Yellow#5)', dictionary)).toEqual([]);
    expect(recallAllergens('Potential Listeria monocytogenes contamination', dictionary)).toEqual([]);
  });

  it('parses dates', () => {
    expect(isoDate('20261028')).toBe('2026-10-28');
    expect(isoDate('2026-10-28T00:00:00')).toBe('2026-10-28');
    expect(isoDate('10/2/2026')).toBe('2026-10-02');
  });

  it('matches recalls by UPC, and by brand and name as a possible match', () => {
    const recall = parseOpenFdaEnforcement(json('openfda/enforcement-allergen.json'), dictionary).find((r) => r.upcs.length > 0)!;
    const matches = matchRecall(recall, [
      { gtin: recall.upcs[0]!, name: 'Anything', brand: 'Any' },
      { gtin: '00044000037451', name: 'Peanut Butter Sandwich Cookie', brand: 'Nutter Butter' },
    ]);
    expect(matches).toEqual([{ gtin: recall.upcs[0], matchType: 'upc', confidence: 1 }]);

    const byName = matchRecall(
      { ...recall, upcs: [], productDescription: 'Acme Crunchy Peanut Butter Cookies, 12 oz', firm: 'Acme Foods Inc.' },
      [{ gtin: '00012345678905', name: 'Crunchy Peanut Butter Cookies', brand: 'Acme' }],
    );
    expect(byName[0]?.matchType).toBe('name');
  });

  // FSIS blocked requests from the development Mac (fixtures/api/fsis/recalls-403.status), so this uses a
  // hand-written record in the documented shape. The field names are unverified against a live response.
  it('parses the FSIS record shape (hand-written sample, not a recording)', () => {
    const recalls = parseFsisRecalls(
      [
        {
          field_recall_number: '001-2026',
          field_title: 'Example Farms Recalls Chicken Sausage Due to Misbranding and an Undeclared Allergen',
          field_recall_reason: 'Misbranding, Unreported Allergens',
          field_summary: '<p>The product contains milk, a known allergen, which is not declared on the label.</p>',
          field_product_items: '12-oz. packages of "Example Chicken Sausage" with UPC 0 44000 03745 1',
          field_recall_date: '2026-10-20',
          field_recall_classification: 'Class I',
          field_establishment: 'Example Farms',
          field_active_notice: 'True',
        },
      ],
      dictionary,
    );
    expect(recalls).toHaveLength(1);
    expect(recalls[0]!.allergensMentioned).toEqual(['milk']);
    expect(recalls[0]!.upcs).toEqual(['00044000037451']);
    expect(recalls[0]!.reportDate).toBe('2026-10-20');
  });
});

describe('chef card', () => {
  const allergens = dictionary.allergens;
  const sam: Profile = { id: 's', name: 'Sam', allergens: [{ allergenId: 'peanut', severity: 'severe' }, { allergenId: 'tree_nut', severity: 'moderate' }] };

  it('builds fixed English text from a profile', () => {
    const card = buildChefCard([sam], allergens);
    expect(card.lines[0]).toBe('My name is Sam. I have a food allergy.');
    expect(card.lines[1]).toContain('peanuts');
    expect(card.lines).toContain('Even a small amount can cause a severe reaction.');
    expect(card.lines.some((l) => /fryer/.test(l))).toBe(true);
    expect(card.lines.at(-1)).toBe('Thank you for your help!');
  });

  it('combines profiles', () => {
    const ana: Profile = { id: 'a', name: 'Ana', allergens: [{ allergenId: 'milk', severity: 'mild' }], customAvoids: [{ term: 'garlic', severity: 'mild' }] };
    const card = buildChefCard([sam, ana], allergens);
    expect(card.lines[0]).toBe('This card is for Sam and Ana. We have a food allergy.');
    expect(card.lines[1]).toContain('garlic');
  });

  it('the hash changes when allergens change, not when order changes', () => {
    const a = chefCardHash([sam]);
    expect(chefCardHash([{ ...sam, allergens: [...sam.allergens].reverse() }])).toBe(a);
    expect(chefCardHash([{ ...sam, allergens: [...sam.allergens, { allergenId: 'milk', severity: 'mild' }] }])).not.toBe(a);
  });
});

describe('ingredients hash', () => {
  it('ignores case and spacing, changes with content', () => {
    expect(ingredientsHash('Sugar,  Salt')).toBe(ingredientsHash('sugar, salt'));
    expect(ingredientsHash('sugar, salt')).not.toBe(ingredientsHash('sugar, salt, milk'));
  });
});
