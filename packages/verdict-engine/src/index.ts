export * from './types.ts';
export {
  ENGINE_VERSION,
  evaluate,
  deriveProductSignals,
  strongestByAllergen,
  strongerSignal,
  worstVerdict,
  type EvaluateInput,
} from './engine.ts';
export {
  expandDictionary,
  validateDictionary,
  compileDictionary,
  isActive,
  effectiveStrength,
  slug,
  type CompactDictionary,
  type TermGroup,
  type CompactTerm,
} from './dictionary.ts';
export { normalizeGtin, isValidGtin, expandUpcE, checkDigit, type GtinInfo } from './gtin.ts';
export { normalizeText, textSimilarity, wordTokens } from './normalize.ts';
export { findTerms, type TermMatch } from './match.ts';
export { parseLabel, parseIngredientTree, extractStatements, type IngredientNode, type Statement } from './parse.ts';
