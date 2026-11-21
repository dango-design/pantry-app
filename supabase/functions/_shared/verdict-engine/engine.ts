// The verdict engine: product records + profiles + dictionary -> one verdict per profile, with reasons.

import { compileDictionary, effectiveStrength, type CompiledDictionary } from './dictionary.ts';
import { normalizeGtin } from './gtin.ts';
import { findTerms, hasVagueTerm } from './match.ts';
import { normalizeText, textSimilarity } from './normalize.ts';
import {
  extractStatements,
  nodeContext,
  parseLabel,
  walk,
  type IngredientNode,
  type Statement,
  type StatementDetector,
} from './parse.ts';
import type {
  Dictionary,
  EvaluationResult,
  Profile,
  ProductRecord,
  ProductSignal,
  ProductWarning,
  Reason,
  Signal,
  Verdict,
} from './types.ts';

export const ENGINE_VERSION = '1.0.0';

const SIGNAL_RANK: Record<Signal, number> = { possible: 0, may_contain: 1, contains: 2 };
const VERDICT_RANK: Record<Verdict, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

export function worstVerdict(verdicts: Verdict[]): Verdict {
  return verdicts.reduce<Verdict>((w, v) => (VERDICT_RANK[v] > VERDICT_RANK[w] ? v : w), 'green');
}

export function strongerSignal(a: Signal, b: Signal): Signal {
  return SIGNAL_RANK[a] >= SIGNAL_RANK[b] ? a : b;
}

interface Fragment {
  text: string;
  context: string;
}

interface RecordAnalysis {
  record: ProductRecord;
  hasIngredients: boolean;
  signals: ProductSignal[];
  warnings: string[];
  vague: Fragment[];
  fragments: Fragment[];
  statements: Statement[];
  ingredientText: string;
}

/** Filler that can sit between allergen names in a statement. */
const STATEMENT_FILLER =
  /\b(?:and|or|and\/or|the|of|from|in|with|products?|ingredients?|derived|source|sources|traces?|including|includes|such as|as|other|its|their|a|an|it|this|product|contains|allergens?|information|statement|advice|type|varieties|variety|species|following)\b/g;

function makeDetector(compiled: CompiledDictionary): StatementDetector {
  return {
    advisory: compiled.advisory,
    isAllergenList(segment: string): boolean {
      const matches = findTerms(segment, compiled, 'statement').filter((m) => m.term.strength !== 'none');
      if (matches.length === 0) return false;
      if (/^\s*(?:less than\s+)?\d|^\s*one or more|^\s*no\b|^\s*none\b/.test(segment)) return false;
      let rest = segment;
      for (const m of [...matches].sort((a, b) => b.start - a.start)) {
        rest = rest.slice(0, m.start) + ' '.repeat(m.end - m.start) + rest.slice(m.end);
      }
      rest = rest.replace(STATEMENT_FILLER, ' ');
      const letters = (rest.match(/\p{L}/gu) ?? []).length;
      const total = (segment.match(/\p{L}/gu) ?? []).length || 1;
      return letters / total <= 0.35;
    },
  };
}

/** Texts to match for one ingredient node, including the "<source> oil" reading when it names an oil. */
const LIST_SEPARATORS = /,|\band\/or\b|\bor\b|\band\b|&/;

function splitList(text: string): string[] {
  return text
    .split(LIST_SEPARATORS)
    .map((t) => t.trim())
    .filter(Boolean);
}

function nodeTexts(node: IngredientNode): string[] {
  const isOil = /\boils?\b/.test(node.text);
  // An oil source ("soybean" under "vegetable oil (soybean and/or canola)") is read as "soybean oil".
  // The oil readings still contain every word of the original, so nothing else is lost.
  if (node.oilContext && !isOil) return splitList(node.text).map((t) => `${t} oil`);
  // "soybean and cottonseed oil" -> "soybean oil", "cottonseed oil".
  const listOil = node.text.match(/^(.+?)\s+(oils?)$/);
  if (listOil && LIST_SEPARATORS.test(listOil[1]!)) return splitList(listOil[1]!).map((t) => `${t} oil`);
  return [node.text];
}

function hasText(s: string | null | undefined): s is string {
  return typeof s === 'string' && s.replace(/[^\p{L}]/gu, '').length >= 2;
}

function analyzeRecord(record: ProductRecord, compiled: CompiledDictionary): RecordAnalysis {
  const detector = makeDetector(compiled);
  const signals: ProductSignal[] = [];
  const warnings: string[] = [];
  const vague: Fragment[] = [];
  const fragments: Fragment[] = [];
  const statements: Statement[] = [];
  let ingredientText = '';
  const hasIngredients = hasText(record.ingredientsText);

  if (hasIngredients) {
    const parsed = parseLabel(record.ingredientsText!, detector);
    ingredientText = parsed.ingredientText;
    statements.push(...parsed.statements);
    warnings.push(...parsed.warnings);
    for (const node of walk(parsed.nodes)) {
      if (!node.text) continue;
      const context = nodeContext(node);
      fragments.push({ text: node.text, context });
      const v = hasVagueTerm(node.text, compiled);
      if (v) vague.push({ text: v, context });
      for (const text of nodeTexts(node)) {
        for (const m of findTerms(text, compiled, 'any')) {
          const strength = effectiveStrength(m.term);
          if (strength === 'none') continue;
          signals.push({
            allergenId: m.term.allergenId,
            signal: strength === 'definite' ? 'contains' : 'possible',
            evidenceText: m.end <= node.text.length && text === node.text ? m.text : node.text,
            context,
            source: record.source,
            ruleId: strength === 'definite' ? 'contains_term' : 'possible_term',
            termId: m.term.id,
            termReviewed: m.active,
          });
        }
      }
    }
  }

  const given: Statement[] = [];
  if (hasText(record.containsStatement)) {
    const s = normalizeText(record.containsStatement);
    const ex = extractStatements(s, detector);
    if (ex.statements.length) {
      given.push(...ex.statements);
      if (hasText(ex.rest) && detector.isAllergenList(ex.rest)) given.push({ kind: 'contains', text: ex.rest });
    } else {
      given.push({ kind: 'contains', text: s });
    }
  }
  if (hasText(record.mayContainStatement)) given.push({ kind: 'advisory', text: normalizeText(record.mayContainStatement) });
  for (const g of given) {
    if (!statements.some((s) => s.kind === g.kind && s.text.includes(g.text.replace(/^contains:?\s*/, '')))) statements.push(g);
  }

  for (const st of statements) {
    for (const m of findTerms(st.text, compiled, 'statement')) {
      if (m.term.strength === 'none') continue;
      let signal: Signal = st.kind === 'contains' ? 'contains' : 'may_contain';
      if (!m.active && signal === 'contains') signal = 'possible';
      signals.push({
        allergenId: m.term.allergenId,
        signal,
        evidenceText: m.text,
        context: st.text,
        source: record.source,
        ruleId: st.kind === 'contains' ? 'contains_statement' : 'may_contain_statement',
        termId: m.term.id,
        termReviewed: m.active,
      });
    }
  }

  const tagSignals = (tags: string[] | undefined, fallback: Signal, ruleId: ProductSignal['ruleId']) => {
    for (const tag of tags ?? []) {
      for (const mapped of compiled.dict.offTagMap[tag] ?? []) {
        signals.push({
          allergenId: mapped.allergenId,
          signal: mapped.signal ?? fallback,
          evidenceText: tag,
          context: 'Open Food Facts allergen tags',
          source: record.source,
          ruleId,
        });
      }
    }
  };
  tagSignals(record.allergenTags, 'contains', 'contains_tag');
  tagSignals(record.traceTags, 'may_contain', 'trace_tag');

  if (record.illegibleParts && record.illegibleParts.length > 0) {
    warnings.push(`Part of the label could not be read: ${record.illegibleParts.join(', ')}`);
  }

  // Signals for an allergen also count for allergens that include it (wheat -> gluten).
  for (const s of [...signals]) {
    for (const parent of compiled.includedBy.get(s.allergenId) ?? []) signals.push({ ...s, allergenId: parent });
  }

  return { record, hasIngredients, signals: dedupeSignals(signals), warnings, vague, fragments, statements, ingredientText };
}

function dedupeSignals(signals: ProductSignal[]): ProductSignal[] {
  const seen = new Set<string>();
  const out: ProductSignal[] = [];
  for (const s of signals) {
    const key = `${s.allergenId}|${s.signal}|${s.evidenceText}|${s.source}|${s.ruleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Allergen-level signals for storing with a product (product_signals). No profiles involved. */
export function deriveProductSignals(records: ProductRecord[], dictionary: Dictionary): ProductSignal[] {
  const compiled = compileDictionary(dictionary);
  return dedupeSignals(records.flatMap((r) => analyzeRecord(r, compiled).signals));
}

/** The strongest signal per allergen across signals. */
export function strongestByAllergen(signals: ProductSignal[]): Map<string, Signal> {
  const out = new Map<string, Signal>();
  for (const s of signals) {
    const prev = out.get(s.allergenId);
    out.set(s.allergenId, prev ? strongerSignal(prev, s.signal) : s.signal);
  }
  return out;
}

export interface EvaluateInput {
  gtin?: string | null;
  records: ProductRecord[];
  profiles: Profile[];
  dictionary: Dictionary;
}

function timeOf(r: ProductRecord): number {
  const t = r.sourceUpdatedAt ? Date.parse(r.sourceUpdatedAt) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function customAvoidRegex(term: string): RegExp {
  const body = normalizeText(term)
    .split(/[\s-]+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s-]+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:s|es)?(?![\\p{L}\\p{N}])`, 'u');
}

export function evaluate(input: EvaluateInput): EvaluationResult {
  const compiled = compileDictionary(input.dictionary);
  const gtinInfo = input.gtin ? normalizeGtin(input.gtin) : null;
  const hasPhoto = input.records.some((r) => r.source === 'household_photo');
  const storeMade = Boolean(gtinInfo?.restrictedCirculation) && !hasPhoto;

  const analyses = input.records.map((r) => analyzeRecord(r, compiled));
  const withIngredients = analyses.filter((a) => a.hasIngredients);
  const hasIngredients = withIngredients.length > 0;
  const signals = dedupeSignals(analyses.flatMap((a) => a.signals));

  const warnings: ProductWarning[] = [];
  // A stray or missing bracket only changes which ingredient is the parent; every word is still
  // matched, so it is shown as a note. Unreadable text can hide an allergen, so it counts.
  const isBracketNote = (w: string) => /bracket/i.test(w);
  for (const w of new Set(analyses.flatMap((a) => a.warnings))) {
    warnings.push({ ruleId: 'parse_warning', message: w, affectsVerdict: !isBracketNote(w) });
  }
  outer: for (let i = 0; i < withIngredients.length; i++) {
    for (let j = i + 1; j < withIngredients.length; j++) {
      const a = withIngredients[i]!;
      const b = withIngredients[j]!;
      if (a.record.source !== b.record.source && textSimilarity(a.ingredientText, b.ingredientText) < 0.5) {
        warnings.push({ ruleId: 'sources_disagree', message: 'Sources list different ingredients for this product', affectsVerdict: true });
        break outer;
      }
    }
  }
  const nonUs = input.records.some((r) => r.labelRegion === 'other');
  if (nonUs) warnings.push({ ruleId: 'non_us_label', message: 'Label from outside the US: allergen labeling rules differ', affectsVerdict: true });

  const newest = [...withIngredients].sort((a, b) => timeOf(b.record) - timeOf(a.record))[0];
  const displayRecord = newest?.record ?? null;
  const vague = withIngredients.flatMap((a) => a.vague);
  const fragments = withIngredients.flatMap((a) => a.fragments);
  const advisoryTexts = analyses.flatMap((a) => a.statements.filter((s) => s.kind === 'advisory').map((s) => s.text));

  const nameOf = (id: string) => (compiled.allergenById.get(id)?.displayName ?? id).toLowerCase();

  const profiles = input.profiles.map((profile) => {
    const reasons: Reason[] = [];
    const add = (r: Reason) => {
      if (!reasons.some((x) => x.allergenId === r.allergenId && x.ruleId === r.ruleId && x.evidenceText === r.evidenceText && x.customTerm === r.customTerm)) {
        reasons.push(r);
      }
    };

    if (storeMade) {
      add({ allergenId: null, signal: null, verdict: 'unknown', evidenceText: '', source: null, ruleId: 'store_made', message: 'Store-made item: ask staff' });
    } else {
      for (const pa of profile.allergens) {
        const name = nameOf(pa.allergenId);
        const avoidMayContain = pa.avoidMayContain ?? pa.severity === 'severe';
        for (const s of signals.filter((x) => x.allergenId === pa.allergenId)) {
          if (s.signal === 'contains') {
            const ruleId = s.ruleId === 'contains_statement' ? 'contains_statement' : s.ruleId === 'contains_tag' ? 'contains_tag' : 'contains_term';
            const message =
              ruleId === 'contains_statement'
                ? `Label says it contains ${name}`
                : ruleId === 'contains_tag'
                  ? `Open Food Facts lists ${name}`
                  : s.evidenceText === name || s.evidenceText === pa.allergenId
                    ? `Contains ${name}`
                    : `Contains ${name} (${s.evidenceText})`;
            add({ allergenId: pa.allergenId, signal: 'contains', verdict: 'red', evidenceText: s.evidenceText, source: s.source, ruleId, message });
          } else if (s.signal === 'may_contain') {
            add({
              allergenId: pa.allergenId,
              signal: 'may_contain',
              verdict: avoidMayContain ? 'red' : 'yellow',
              evidenceText: s.evidenceText,
              source: s.source,
              ruleId: avoidMayContain ? 'may_contain_avoided' : 'may_contain_allowed',
              message: avoidMayContain ? `May contain ${name}` : `May contain ${name} (you allow this)`,
            });
          } else {
            add({
              allergenId: pa.allergenId,
              signal: 'possible',
              verdict: 'yellow',
              evidenceText: s.evidenceText,
              source: s.source,
              ruleId: 'possible_term',
              message: s.termReviewed === false ? `Check: ${s.evidenceText} (unreviewed term)` : `Check: ${s.evidenceText}`,
            });
          }
        }
        // Vague words ("natural flavors") can hide an allergen. US law requires the 9 majors to be
        // declared even inside flavorings, so on a US label they flag only non-major allergens.
        const allergen = compiled.allergenById.get(pa.allergenId);
        if (vague.length > 0 && (!allergen?.isUsMajor || nonUs)) {
          const v = vague[0]!;
          add({ allergenId: pa.allergenId, signal: 'possible', verdict: 'yellow', evidenceText: v.text, source: displayRecord?.source ?? null, ruleId: 'vague_term', message: `Check: "${v.text}" may hide ${name}` });
        }
      }

      for (const ca of profile.customAvoids ?? []) {
        const re = customAvoidRegex(ca.term);
        const hit = fragments.find((f) => re.test(f.text));
        if (hit) {
          const m = re.exec(hit.text)?.[0] ?? ca.term;
          add({ allergenId: null, customTerm: ca.term, signal: 'contains', verdict: 'red', evidenceText: m, source: displayRecord?.source ?? null, ruleId: 'custom_avoid', message: `Contains ${ca.term}${m !== ca.term ? ` (${m})` : ''}` });
          continue;
        }
        const adv = advisoryTexts.find((t) => re.test(t));
        if (adv) {
          add({ allergenId: null, customTerm: ca.term, signal: 'may_contain', verdict: ca.severity === 'severe' ? 'red' : 'yellow', evidenceText: ca.term, source: displayRecord?.source ?? null, ruleId: 'custom_avoid_may_contain', message: `May contain ${ca.term}` });
          continue;
        }
        if (vague.length > 0) {
          const v = vague[0]!;
          add({ allergenId: null, customTerm: ca.term, signal: 'possible', verdict: 'yellow', evidenceText: v.text, source: displayRecord?.source ?? null, ruleId: 'vague_term', message: `Check: "${v.text}" may hide ${ca.term}` });
        }
      }

      const protects = profile.allergens.length > 0 || (profile.customAvoids?.length ?? 0) > 0;
      if (protects && hasIngredients) {
        for (const w of warnings.filter((x) => x.affectsVerdict)) {
          add({ allergenId: null, signal: null, verdict: 'yellow', evidenceText: '', source: null, ruleId: w.ruleId, message: w.message });
        }
      }

      if (!hasIngredients && !reasons.some((r) => r.verdict === 'red')) {
        add({ allergenId: null, signal: null, verdict: 'unknown', evidenceText: '', source: null, ruleId: 'no_ingredients', message: "We don't have ingredients for this product" });
      }
    }

    const verdict: Verdict = reasons.length === 0 ? 'green' : worstVerdict(reasons.map((r) => r.verdict));
    reasons.sort((a, b) => VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict]);
    const summary = verdict === 'green' ? `No listed allergens for ${profile.name}` : reasons[0]!.message;
    return { profileId: profile.id, profileName: profile.name, verdict, reasons, summary };
  });

  const overall: Verdict = profiles.length === 0 ? 'unknown' : worstVerdict(profiles.map((p) => p.verdict));
  const triggerWords = [...new Set(signals.filter((s) => s.ruleId === 'contains_term' || s.ruleId === 'possible_term').map((s) => s.evidenceText))];
  const fromPhoto = displayRecord?.source === 'household_photo';
  const ocrOnly = fromPhoto && displayRecord?.extraction === 'ocr';
  const unconfirmedPhoto = fromPhoto && !displayRecord?.confirmed;

  return {
    overall,
    profiles,
    signals,
    warnings,
    display: {
      ingredientsText: displayRecord?.ingredientsText ?? null,
      containsStatement: displayRecord?.containsStatement ?? null,
      mayContainStatement: displayRecord?.mayContainStatement ?? null,
      source: displayRecord?.source ?? null,
      sourceUpdatedAt: displayRecord?.sourceUpdatedAt ?? null,
      triggerWords,
    },
    confidence: {
      fromPhoto,
      unconfirmedPhoto,
      ocrOnly,
      label: ocrOnly
        ? unconfirmedPhoto
          ? 'OCR only, unconfirmed'
          : 'Read by the phone from your photo; you checked the text'
        : unconfirmedPhoto
          ? 'From photo, unconfirmed'
          : fromPhoto
            ? 'From your photo'
            : null,
    },
    storeMade,
    engineVersion: ENGINE_VERSION,
  };
}
