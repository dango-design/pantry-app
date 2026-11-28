import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expandDictionary, type CompactDictionary } from '../src/dictionary.ts';
import type { Dictionary, Profile, ProductRecord, ProfileAllergen } from '../src/types.ts';

const dataDir = fileURLToPath(new URL('../data/', import.meta.url));

export function loadCompact(): CompactDictionary {
  return JSON.parse(readFileSync(`${dataDir}dictionary.json`, 'utf8')) as CompactDictionary;
}

export const dictionary: Dictionary = expandDictionary(loadCompact());

export function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export const dataPath = (name: string) => `${dataDir}${name}`;

export function rec(ingredientsText: string | null, extra: Partial<ProductRecord> = {}): ProductRecord {
  return { source: 'usda', ingredientsText, labelRegion: 'us', extraction: 'database', ...extra };
}

export function profile(name: string, allergens: (string | ProfileAllergen)[], customAvoids: Profile['customAvoids'] = []): Profile {
  return {
    id: name.toLowerCase(),
    name,
    allergens: allergens.map((a) => (typeof a === 'string' ? { allergenId: a, severity: 'severe' } : a)),
    customAvoids,
  };
}

export const US_MAJORS = ['milk', 'egg', 'peanut', 'tree_nut', 'wheat', 'soy', 'fish', 'shellfish', 'sesame'] as const;
