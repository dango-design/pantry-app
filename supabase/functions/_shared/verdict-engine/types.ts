// Shared types for the verdict engine. The engine is pure: same input, same output.

export type AllergenId = string;

/** How strongly one product signals one allergen. Ordered weakest to strongest. */
export type Signal = 'possible' | 'may_contain' | 'contains';

export type Verdict = 'green' | 'yellow' | 'red' | 'unknown';

export type Severity = 'severe' | 'moderate' | 'mild';

export type ProductSource = 'usda' | 'off' | 'household_photo';

/** How the ingredient text was obtained. Photo-derived text is lower confidence. */
export type Extraction = 'database' | 'llm' | 'ocr';

/** Where the label was printed. US labels follow FALCPA, so majors in flavorings must be declared. */
export type LabelRegion = 'us' | 'other' | 'unknown';

export interface Allergen {
  id: AllergenId;
  displayName: string;
  isUsMajor: boolean;
  /** Signals for these allergens also count for this one (gluten includes wheat). */
  includes?: AllergenId[];
}

export type MatchType = 'exact' | 'word' | 'regex';
/** "none" marks a guard: the phrase is known NOT to be this allergen ("cocoa butter" for milk). */
export type TermStrength = 'definite' | 'possible' | 'none';
export type TermScope = 'any' | 'statement';
export type TermAddedBy = 'import' | 'claude' | 'human';

/**
 * One ingredient word or phrase mapped to one allergen. A longer active phrase hides shorter terms of
 * the same allergen inside it: "peanut oil" (possible) hides "peanut" (definite); "cocoa butter"
 * (strength none, a guard) hides "butter" for milk. Other allergens are never hidden.
 */
export interface AllergenTerm {
  id: string;
  allergenId: AllergenId;
  term: string;
  matchType: MatchType;
  strength: TermStrength;
  scope: TermScope;
  sourceUrl: string | null;
  reviewed: boolean;
  addedBy: TermAddedBy;
  note?: string;
}

export interface Dictionary {
  version: string;
  allergens: Allergen[];
  terms: AllergenTerm[];
  /** Phrases that start a precautionary statement ("may contain", "made on shared equipment"). */
  advisoryPhrases: string[];
  /** Words that hide what is inside ("natural flavors", "spices"). */
  vagueTerms: string[];
  /** Open Food Facts allergen tags ("en:milk") to our allergen ids. */
  offTagMap: Record<string, { allergenId: AllergenId; signal?: Signal }[]>;
}

/** One product record from one source. A barcode can have several. */
export interface ProductRecord {
  source: ProductSource;
  sourceId?: string | null;
  gtin?: string | null;
  name?: string | null;
  brand?: string | null;
  ingredientsText: string | null;
  containsStatement?: string | null;
  mayContainStatement?: string | null;
  /** Open Food Facts allergens_tags, e.g. ["en:milk"]. Extra signals only. */
  allergenTags?: string[];
  /** Open Food Facts traces_tags. Extra signals only. */
  traceTags?: string[];
  sourceUpdatedAt?: string | null;
  extraction?: Extraction;
  /** For photo records: has a person checked the extracted text? */
  confirmed?: boolean;
  labelRegion?: LabelRegion;
  /** Parts of the label the extractor could not read. */
  illegibleParts?: string[];
}

export interface ProfileAllergen {
  allergenId: AllergenId;
  severity: Severity;
  /** Treat "may contain" as red. Defaults to true for severe. */
  avoidMayContain?: boolean;
}

export interface CustomAvoid {
  term: string;
  severity: Severity;
}

export interface Profile {
  id: string;
  name: string;
  allergens: ProfileAllergen[];
  customAvoids?: CustomAvoid[];
}

export type RuleId =
  | 'no_ingredients'
  | 'store_made'
  | 'contains_term'
  | 'contains_statement'
  | 'contains_tag'
  | 'may_contain_avoided'
  | 'may_contain_allowed'
  | 'possible_term'
  | 'vague_term'
  | 'custom_avoid'
  | 'custom_avoid_may_contain'
  | 'parse_warning'
  | 'sources_disagree'
  | 'non_us_label';

/** One allergen-level finding for a product, before any profile is applied. */
export interface ProductSignal {
  allergenId: AllergenId;
  signal: Signal;
  /** The words that triggered it, as they appear in the text. */
  evidenceText: string;
  /** The ingredient the words came from, with its parent if nested. */
  context: string;
  source: ProductSource;
  ruleId: 'contains_term' | 'contains_statement' | 'contains_tag' | 'may_contain_statement' | 'trace_tag' | 'possible_term';
  termId?: string;
  /** False when the term was added by Claude and nobody has reviewed it yet. */
  termReviewed?: boolean;
}

export interface Reason {
  allergenId: AllergenId | null;
  /** For custom avoids: the person's own term. */
  customTerm?: string;
  signal: Signal | null;
  verdict: Verdict;
  evidenceText: string;
  source: ProductSource | null;
  ruleId: RuleId;
  /** Ready-to-show sentence, e.g. "Contains milk (whey)". */
  message: string;
}

export interface ProfileVerdict {
  profileId: string;
  profileName: string;
  verdict: Verdict;
  reasons: Reason[];
  /** Short line for the result row. */
  summary: string;
}

export interface ProductWarning {
  ruleId: 'parse_warning' | 'sources_disagree' | 'non_us_label';
  message: string;
  /** False for notes that cannot hide an allergen (a stray bracket: every word is still checked). */
  affectsVerdict: boolean;
}

export interface EvaluationResult {
  overall: Verdict;
  profiles: ProfileVerdict[];
  signals: ProductSignal[];
  warnings: ProductWarning[];
  /** The ingredient text to show: the newest record that has one. */
  display: {
    ingredientsText: string | null;
    containsStatement: string | null;
    mayContainStatement: string | null;
    source: ProductSource | null;
    sourceUpdatedAt: string | null;
    /** Words to highlight in ingredientsText. */
    triggerWords: string[];
  };
  confidence: {
    fromPhoto: boolean;
    unconfirmedPhoto: boolean;
    ocrOnly: boolean;
    label: string | null;
  };
  storeMade: boolean;
  engineVersion: string;
}
