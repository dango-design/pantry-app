// Builds the English text of a chef card from a profile. The English is fixed text, so it is the same
// every time and works offline; only translations come from Claude.

import type { Allergen, Profile, Severity } from '@allergy/verdict-engine';

export interface ChefCardText {
  title: string;
  lines: string[];
}

/** Plain-language names for restaurant staff. */
const PLAIN: Record<string, string> = {
  milk: 'milk or dairy (butter, cheese, cream, whey)',
  egg: 'eggs',
  peanut: 'peanuts',
  tree_nut: 'tree nuts (almonds, cashews, walnuts, pecans, pistachios, hazelnuts)',
  wheat: 'wheat',
  soy: 'soy',
  fish: 'fish',
  shellfish: 'shellfish (shrimp, crab, lobster)',
  sesame: 'sesame',
  gluten: 'gluten (wheat, barley, rye)',
  mollusc: 'molluscs (clams, mussels, oysters, squid)',
  coconut: 'coconut',
  mustard: 'mustard',
  celery: 'celery',
  lupin: 'lupin',
  sulfites: 'sulfites',
};

const SEVERITY_RANK: Record<Severity, number> = { mild: 0, moderate: 1, severe: 2 };

function joinList(items: string[], word: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

/** One card for one or more profiles. */
export function buildChefCard(profiles: Profile[], allergens: Allergen[]): ChefCardText {
  const byId = new Map(allergens.map((a) => [a.id, a]));
  const names = profiles.map((p) => p.name);
  const items = new Map<string, Severity>();
  for (const p of profiles) {
    for (const a of p.allergens) {
      const prev = items.get(PLAIN[a.allergenId] ?? byId.get(a.allergenId)?.displayName.toLowerCase() ?? a.allergenId);
      const label = PLAIN[a.allergenId] ?? byId.get(a.allergenId)?.displayName.toLowerCase() ?? a.allergenId;
      if (!prev || SEVERITY_RANK[a.severity] > SEVERITY_RANK[prev]) items.set(label, a.severity);
    }
    for (const c of p.customAvoids ?? []) {
      const prev = items.get(c.term);
      if (!prev || SEVERITY_RANK[c.severity] > SEVERITY_RANK[prev]) items.set(c.term, c.severity);
    }
  }
  const worst = [...items.values()].reduce<Severity>((w, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[w] ? s : w), 'mild');
  const who = names.length === 1 ? names[0]! : joinList(names);
  const pronoun = names.length === 1 ? 'I' : 'We';
  const lines: string[] = [];
  lines.push(`${pronoun === 'I' ? `My name is ${who}.` : `This card is for ${who}.`} ${pronoun} have a food allergy.`);
  lines.push(`Please make sure my food contains no ${joinList([...items.keys()], 'or')}.`);
  if (worst === 'severe') {
    lines.push('Even a small amount can cause a severe reaction.');
  } else if (worst === 'moderate') {
    lines.push('Even small amounts can make me sick.');
  }
  lines.push('Please use clean utensils, pans and surfaces, prepare my food separately, and do not use shared fryer oil.');
  lines.push('Please check sauces, dressings, marinades, oils and garnishes too.');
  lines.push('Thank you for your help!');
  return { title: 'Food allergy', lines };
}

/** Changes whenever the card's content would change, so stored translations can be refreshed. */
export function chefCardHash(profiles: Profile[]): string {
  const key = profiles
    .map((p) =>
      [
        p.name,
        ...p.allergens.map((a) => `${a.allergenId}:${a.severity}`).sort(),
        ...(p.customAvoids ?? []).map((c) => `~${c.term.toLowerCase()}:${c.severity}`).sort(),
      ].join('|'),
    )
    .sort()
    .join('||');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function chefCardToText(card: ChefCardText): string {
  return [card.title, '', ...card.lines].join('\n');
}

/** Languages offered in settings. Codes are BCP 47. */
export const CHEF_CARD_LANGUAGES: { code: string; name: string }[] = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
];
