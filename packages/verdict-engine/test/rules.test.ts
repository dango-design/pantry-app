// One test per row of the rules table in the build plan, plus the edge rules around it.

import { describe, expect, it } from 'vitest';

import { evaluate } from '../src/engine.ts';
import { dictionary, profile, rec } from './helpers.ts';

const sam = profile('Sam', ['milk']);

describe('rules table', () => {
  it('no ingredient text from any source -> unknown', () => {
    const r = evaluate({ records: [rec(null)], profiles: [sam], dictionary });
    expect(r.overall).toBe('unknown');
    expect(r.profiles[0]!.reasons[0]!.ruleId).toBe('no_ingredients');
    expect(r.profiles[0]!.summary).toBe("We don't have ingredients for this product");
  });

  it('no records at all -> unknown', () => {
    expect(evaluate({ records: [], profiles: [sam], dictionary }).overall).toBe('unknown');
  });

  it('contains: definite term -> red, "Contains milk (whey)"', () => {
    const r = evaluate({ records: [rec('Sugar, whey, salt')], profiles: [sam], dictionary });
    expect(r.overall).toBe('red');
    expect(r.profiles[0]!.summary).toBe('Contains milk (whey)');
    expect(r.profiles[0]!.reasons[0]!.ruleId).toBe('contains_term');
  });

  it('contains: "Contains" statement -> red', () => {
    const r = evaluate({ records: [rec('Sugar, salt. Contains: milk.')], profiles: [sam], dictionary });
    expect(r.overall).toBe('red');
    expect(r.profiles[0]!.reasons.some((x) => x.ruleId === 'contains_statement')).toBe(true);
  });

  it('may contain, avoid_may_contain on -> red', () => {
    const p = profile('Sam', [{ allergenId: 'peanut', severity: 'moderate', avoidMayContain: true }]);
    const r = evaluate({ records: [rec('Oats, sugar. May contain peanuts.')], profiles: [p], dictionary });
    expect(r.overall).toBe('red');
    expect(r.profiles[0]!.summary).toBe('May contain peanuts');
  });

  it('may contain, avoid_may_contain off -> yellow "(you allow this)"', () => {
    const p = profile('Sam', [{ allergenId: 'peanut', severity: 'severe', avoidMayContain: false }]);
    const r = evaluate({ records: [rec('Oats, sugar. May contain peanuts.')], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
    expect(r.profiles[0]!.summary).toBe('May contain peanuts (you allow this)');
  });

  it('avoid_may_contain defaults to on for severe and off otherwise', () => {
    const text = 'Rice. Made in a facility that also processes milk.';
    const severe = evaluate({ records: [rec(text)], profiles: [profile('A', [{ allergenId: 'milk', severity: 'severe' }])], dictionary });
    const mild = evaluate({ records: [rec(text)], profiles: [profile('B', [{ allergenId: 'milk', severity: 'mild' }])], dictionary });
    expect(severe.overall).toBe('red');
    expect(mild.overall).toBe('yellow');
  });

  it('possible term (highly refined peanut oil) -> yellow "Check: ..."', () => {
    const p = profile('Sam', ['peanut']);
    const r = evaluate({ records: [rec('Potatoes, peanut oil, salt')], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
    expect(r.profiles[0]!.summary).toBe('Check: peanut oil');
  });

  it('vague term for a custom avoid -> yellow', () => {
    const p = profile('Sam', [], [{ term: 'garlic', severity: 'moderate' }]);
    const r = evaluate({ records: [rec('Tomatoes, salt, natural flavors')], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
    expect(r.profiles[0]!.reasons[0]!.ruleId).toBe('vague_term');
  });

  it('vague term for a non-major allergen (mustard) -> yellow', () => {
    const p = profile('Sam', ['mustard']);
    const r = evaluate({ records: [rec('Vinegar, spices, salt')], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
  });

  it('vague term does NOT flag a major allergen on a US label', () => {
    const p = profile('Sam', ['milk', 'peanut', 'soy']);
    const r = evaluate({ records: [rec('Tomatoes, salt, natural flavors, spices')], profiles: [p], dictionary });
    expect(r.overall).toBe('green');
  });

  it('vague term flags a major allergen on a non-US label', () => {
    const p = profile('Sam', ['milk']);
    const r = evaluate({ records: [rec('Tomatoes, salt, natural flavors', { labelRegion: 'other' })], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
    expect(r.profiles[0]!.reasons.map((x) => x.ruleId)).toContain('vague_term');
  });

  it('in-store barcode (restricted circulation) -> unknown "Store-made item: ask staff"', () => {
    const r = evaluate({ gtin: '0212345012345', records: [rec('Flour, water')], profiles: [sam], dictionary });
    expect(r.overall).toBe('unknown');
    expect(r.storeMade).toBe(true);
    expect(r.profiles[0]!.summary).toBe('Store-made item: ask staff');
  });

  it('a photo of a store-made label is evaluated normally', () => {
    const r = evaluate({
      gtin: '0212345012345',
      records: [rec('Flour, butter', { source: 'household_photo', extraction: 'llm', confirmed: true })],
      profiles: [sam],
      dictionary,
    });
    expect(r.storeMade).toBe(false);
    expect(r.overall).toBe('red');
  });

  it('none of the above -> green "No listed allergens for Sam"', () => {
    const r = evaluate({ records: [rec('Water, sugar, salt')], profiles: [sam], dictionary });
    expect(r.overall).toBe('green');
    expect(r.profiles[0]!.summary).toBe('No listed allergens for Sam');
  });
});

describe('several profiles', () => {
  it('gives a separate verdict per profile and the worst as overall', () => {
    const r = evaluate({
      records: [rec('Wheat flour, sugar, peanut oil')],
      profiles: [profile('Ana', ['milk']), profile('Ben', ['peanut']), profile('Cy', ['wheat'])],
      dictionary,
    });
    expect(r.profiles.map((p) => p.verdict)).toEqual(['green', 'yellow', 'red']);
    expect(r.overall).toBe('red');
  });

  it('a profile with no allergens is green when ingredients exist', () => {
    const r = evaluate({ records: [rec('Milk')], profiles: [profile('Dee', [])], dictionary });
    expect(r.overall).toBe('green');
  });
});

describe('sources and confidence', () => {
  it('merges signals across sources: the most cautious wins', () => {
    const r = evaluate({
      records: [rec('Sugar, cocoa', { source: 'usda' }), rec('Sugar, cocoa, milk', { source: 'off' })],
      profiles: [sam],
      dictionary,
    });
    expect(r.overall).toBe('red');
  });

  it('uses Open Food Facts tags as extra signals', () => {
    const r = evaluate({ records: [rec('Sugar, cocoa', { source: 'off', allergenTags: ['en:milk'] })], profiles: [sam], dictionary });
    expect(r.overall).toBe('red');
    expect(r.profiles[0]!.reasons[0]!.ruleId).toBe('contains_tag');
  });

  it('trace tags count as may contain', () => {
    const p = profile('Sam', [{ allergenId: 'peanut', severity: 'mild' }]);
    const r = evaluate({ records: [rec('Sugar, cocoa', { source: 'off', traceTags: ['en:peanuts'] })], profiles: [p], dictionary });
    expect(r.overall).toBe('yellow');
  });

  it('sources that disagree make every protected profile at least yellow', () => {
    const r = evaluate({
      records: [
        rec('Corn, sunflower oil, salt', { source: 'usda' }),
        rec('Rice flour, sugar, cocoa, vanilla extract, baking soda', { source: 'off' }),
      ],
      profiles: [sam],
      dictionary,
    });
    expect(r.overall).toBe('yellow');
    expect(r.warnings.map((w) => w.ruleId)).toContain('sources_disagree');
  });

  it('shows the newest ingredient text', () => {
    const r = evaluate({
      records: [
        rec('Old text, salt', { source: 'usda', sourceUpdatedAt: '2024-01-01' }),
        rec('New text, salt', { source: 'off', sourceUpdatedAt: '2026-01-01' }),
      ],
      profiles: [sam],
      dictionary,
    });
    expect(r.display.ingredientsText).toBe('New text, salt');
    expect(r.display.source).toBe('off');
  });

  it('labels unconfirmed photo verdicts but keeps their color', () => {
    const r = evaluate({
      records: [rec('Sugar, whey', { source: 'household_photo', extraction: 'llm', confirmed: false })],
      profiles: [sam],
      dictionary,
    });
    expect(r.overall).toBe('red');
    expect(r.confidence.label).toBe('From photo, unconfirmed');
  });

  it('labels OCR-only verdicts, and says so once the person has checked the text', () => {
    const r = evaluate({
      records: [rec('Sugar, salt', { source: 'household_photo', extraction: 'ocr', confirmed: false })],
      profiles: [sam],
      dictionary,
    });
    expect(r.confidence.label).toBe('OCR only, unconfirmed');
    const checked = evaluate({
      records: [rec('Sugar, salt', { source: 'household_photo', extraction: 'ocr', confirmed: true })],
      profiles: [sam],
      dictionary,
    });
    expect(checked.confidence.label).toBe('Read by the phone from your photo; you checked the text');
  });

  it('statement-only data can be red but never green', () => {
    const red = evaluate({ records: [rec(null, { containsStatement: 'Contains: milk' })], profiles: [sam], dictionary });
    const unknown = evaluate({ records: [rec(null, { containsStatement: 'Contains: soy' })], profiles: [sam], dictionary });
    expect(red.overall).toBe('red');
    expect(unknown.overall).toBe('unknown');
  });

  it('illegible parts of a photo make the verdict at least yellow', () => {
    const r = evaluate({
      records: [rec('Rice, salt', { source: 'household_photo', extraction: 'llm', confirmed: true, illegibleParts: ['last line'] })],
      profiles: [sam],
      dictionary,
    });
    expect(r.overall).toBe('yellow');
  });

  it('unbalanced brackets are noted but do not change the verdict, since every word is still checked', () => {
    const r = evaluate({ records: [rec('Rice, seasoning (salt, garlic')], profiles: [sam], dictionary });
    expect(r.overall).toBe('green');
    expect(r.warnings).toEqual([{ ruleId: 'parse_warning', message: 'Unclosed bracket in the ingredient list', affectsVerdict: false }]);
    const hidden = evaluate({ records: [rec('Rice, seasoning (salt, whey')], profiles: [sam], dictionary });
    expect(hidden.overall).toBe('red');
  });

  it('unreadable text makes the verdict at least yellow', () => {
    const r = evaluate({ records: [rec('Rice, salt, [illegible], sugar')], profiles: [sam], dictionary });
    expect(r.overall).toBe('yellow');
  });
});

describe('custom avoids', () => {
  it('a direct match is red', () => {
    const p = profile('Sam', [], [{ term: 'garlic', severity: 'mild' }]);
    const r = evaluate({ records: [rec('Tomatoes, garlic powder, salt')], profiles: [p], dictionary });
    expect(r.overall).toBe('red');
    expect(r.profiles[0]!.summary).toBe('Contains garlic');
  });

  it('a match in a may-contain statement is red when severe, yellow otherwise', () => {
    const text = 'Rice. May contain mustard.';
    const severe = evaluate({ records: [rec(text)], profiles: [profile('A', [], [{ term: 'mustard', severity: 'severe' }])], dictionary });
    const mild = evaluate({ records: [rec(text)], profiles: [profile('B', [], [{ term: 'mustard', severity: 'mild' }])], dictionary });
    expect(severe.overall).toBe('red');
    expect(mild.overall).toBe('yellow');
  });
});

describe('gluten includes wheat', () => {
  it('a wheat term flags gluten', () => {
    const r = evaluate({ records: [rec('Wheat flour, water')], profiles: [profile('G', ['gluten'])], dictionary });
    expect(r.overall).toBe('red');
  });
  it('barley flags gluten but not wheat', () => {
    const r = evaluate({ records: [rec('Barley, water')], profiles: [profile('G', ['gluten']), profile('W', ['wheat'])], dictionary });
    expect(r.profiles.map((p) => p.verdict)).toEqual(['red', 'green']);
  });
});
