// Splits label text into an ingredient tree and separate allergen statements.

import { normalizeText } from './normalize.ts';

export interface IngredientNode {
  /** The ingredient's own words, without its bracketed sub-ingredients. */
  text: string;
  children: IngredientNode[];
  parent: IngredientNode | null;
  /**
   * True when the words name the source of an oil: "soybean" in "corn, soybean, and/or canola oil"
   * or in "vegetable oil (soybean, canola)". Highly refined oils are exempt from allergen labeling.
   */
  oilContext?: boolean;
  /** Text before clean-up, used to spot "and/or ... oil" runs. */
  rawText?: string;
}

export interface Statement {
  kind: 'contains' | 'advisory';
  text: string;
}

export interface ParsedLabel {
  nodes: IngredientNode[];
  statements: Statement[];
  warnings: string[];
  /** The normalized ingredient text with statements removed. */
  ingredientText: string;
}

const OPEN = '([{';
const CLOSE = ')]}';

/** Label boilerplate that is not an ingredient: "ingredients:", "contains 2% or less of:". */
const BOILERPLATE: RegExp[] = [
  /^\s*ingredients?\s*:?\s*/,
  /\b(?:contains|containing)\s+(?:less\s+than\s+)?\d+(?:\.\d+)?\s*%\s*(?:or\s+less\s+)?(?:of\s+)?(?:each\s+of\s+)?(?:the\s+following\s*)?:?/g,
  /\bless\s+than\s+\d+(?:\.\d+)?\s*%\s*(?:of\s+)?(?:each\s+of\s+)?(?:the\s+following\s*)?:?/g,
  /\b(?:contains|containing)\s+one\s+or\s+more\s+of\s+(?:the\s+following\s*)?:?/g,
  /\bone\s+or\s+more\s+of\s+the\s+following\s*:?/g,
];

/** Find sentence ends: a period not inside a number, at bracket depth 0. */
function sentenceEnds(text: string): number[] {
  const ends: number[] = [];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
    else if (ch === '.' && depth === 0) {
      const prev = text[i - 1] ?? '';
      const next = text[i + 1] ?? '';
      if (/\d/.test(prev) && /\d/.test(next)) continue;
      ends.push(i);
    }
  }
  return ends;
}

function depthAt(text: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    const ch = text[i]!;
    if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth = Math.max(0, depth - 1);
  }
  return depth;
}

export interface StatementDetector {
  advisory: RegExp[];
  /** Decides whether the words after "contains" are an allergen list. */
  isAllergenList: (segment: string) => boolean;
}

const CONTAINS_START = /\b(?:allergens?|allergy\s+(?:information|advice)|allergen\s+(?:information|statement))\s*[:-]|\bcontains\b\s*:?/g;

/** Pull "Contains ..." and precautionary sentences out of a label text. */
export function extractStatements(
  normalized: string,
  detector: StatementDetector,
): { rest: string; statements: Statement[] } {
  type Span = { start: number; end: number; kind: Statement['kind'] };
  const spans: Span[] = [];
  const ends = sentenceEnds(normalized);
  const endFrom = (start: number) => {
    for (const e of ends) if (e > start) return e;
    return normalized.length;
  };

  for (const re of detector.advisory) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of normalized.matchAll(g)) {
      const start = m.index ?? 0;
      spans.push({ start, end: endFrom(start), kind: 'advisory' });
    }
  }

  for (const m of normalized.matchAll(CONTAINS_START)) {
    const start = m.index ?? 0;
    if (depthAt(normalized, start) > 0) continue;
    const end = endFrom(start);
    const body = normalized.slice(start + m[0].length, end);
    if (detector.isAllergenList(body)) spans.push({ start, end, kind: 'contains' });
  }

  if (spans.length === 0) return { rest: normalized, statements: [] };

  // Merge overlaps. An advisory span inside a contains span ends the contains span early.
  spans.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.kind !== last.kind && s.start > last.start) {
        last.end = s.start;
        merged.push(s);
      } else {
        last.end = Math.max(last.end, s.end);
      }
    } else {
      merged.push({ ...s });
    }
  }

  const statements: Statement[] = merged.map((s) => ({
    kind: s.kind,
    text: normalized.slice(s.start, s.end).replace(/[.\s]+$/, '').trim(),
  }));
  let rest = '';
  let cursor = 0;
  for (const s of merged) {
    rest += normalized.slice(cursor, s.start) + ' ';
    cursor = Math.min(normalized.length, s.end + 1);
  }
  rest += normalized.slice(cursor);
  return { rest: rest.replace(/\s+/g, ' ').trim(), statements };
}

function stripBoilerplate(text: string): string {
  let s = text;
  for (const re of BOILERPLATE) s = s.replace(re, ', ');
  return s;
}

/** Build the ingredient tree, keeping sub-ingredients under their parent. */
export function parseIngredientTree(text: string): { nodes: IngredientNode[]; warnings: string[] } {
  const warnings: string[] = [];
  const root: IngredientNode = { text: '', children: [], parent: null };
  const stack: IngredientNode[] = [root];
  let current: IngredientNode = { text: '', children: [], parent: root };
  let unmatchedClose = 0;

  const flush = () => {
    const parent = stack[stack.length - 1]!;
    current.rawText = current.text.trim();
    current.text = cleanName(current.text);
    if (current.text || current.children.length) {
      current.parent = parent;
      parent.children.push(current);
    }
    current = { text: '', children: [], parent };
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (OPEN.includes(ch)) {
      // Sub-ingredients belong to the ingredient named so far.
      const node = current;
      node.parent = stack[stack.length - 1]!;
      stack.push(node);
      current = { text: '', children: [], parent: node };
    } else if (CLOSE.includes(ch)) {
      if (stack.length === 1) {
        unmatchedClose++;
        continue;
      }
      flush();
      const node = stack.pop()!;
      // Re-open the parent so text after ")" joins it: "chocolate (cocoa) chips".
      current = node;
      const parent = stack[stack.length - 1]!;
      const idx = parent.children.indexOf(node);
      if (idx >= 0) parent.children.splice(idx, 1);
    } else if (ch === ',' || ch === ';' || (ch === '.' && !/\d/.test(text[i + 1] ?? ''))) {
      flush();
    } else if (ch === ':' ) {
      // "seasoning: salt, garlic" lists sub-ingredients without brackets; keep them as siblings.
      flush();
    } else {
      current.text += ch;
    }
  }
  flush();
  while (stack.length > 1) {
    const node = stack.pop()!;
    const parent = stack[stack.length - 1]!;
    node.text = cleanName(node.text);
    if (!parent.children.includes(node) && (node.text || node.children.length)) parent.children.push(node);
    warnings.push('Unclosed bracket in the ingredient list');
  }
  if (unmatchedClose > 0) warnings.push('Unmatched closing bracket in the ingredient list');

  const fix = (nodes: IngredientNode[], parent: IngredientNode | null) => {
    markOilRuns(nodes, parent);
    for (const n of nodes) {
      n.parent = parent;
      fix(n.children, n);
    }
  };
  fix(root.children, null);
  return { nodes: root.children, warnings };
}

const OIL_END = /\boils?$/;

/** Words that name a cooking-oil source. Only these join an "X, Y, or Z oil" run. */
const OIL_SOURCES = new Set([
  'soybean', 'soy', 'soya', 'peanut', 'canola', 'corn', 'cottonseed', 'sunflower', 'high oleic sunflower',
  'safflower', 'high oleic safflower', 'palm', 'palm kernel', 'palm fruit', 'coconut', 'olive', 'rapeseed',
  'sesame', 'almond', 'walnut', 'hazelnut', 'rice bran', 'grapeseed', 'avocado', 'flaxseed', 'expeller pressed canola',
]);

/** Mark ingredient words that name an oil's source. */
function markOilRuns(siblings: IngredientNode[], parent: IngredientNode | null): void {
  if (parent && OIL_END.test(parent.text)) {
    for (const n of siblings) if (n.children.length === 0) n.oilContext = true;
  }
  // "corn, soybean, and/or canola oil": the short items before the final "or ... oil" are oils too.
  for (let j = 0; j < siblings.length; j++) {
    const raw = siblings[j]!.rawText ?? '';
    if (!/^(?:and\/or|or|and)\s/.test(raw) || !OIL_END.test(siblings[j]!.text)) continue;
    for (let i = j - 1; i >= 0; i--) {
      const n = siblings[i]!;
      if (n.children.length > 0 || !OIL_SOURCES.has(n.text)) break;
      n.oilContext = true;
    }
  }
}

function cleanName(s: string): string {
  return s
    .replace(/^\s*(?:and|or|and\/or|&)\s+/, '')
    .replace(/\s+(?:and|or|and\/or)\s*$/, '')
    .replace(/^[\s"'-]+|[\s"'-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Flags text that looks partly unreadable: replacement characters, illegible markers, stray symbols. */
export function unreadableWarnings(normalized: string): string[] {
  const warnings: string[] = [];
  if (/�|\billegible\b|\[\?+\]|\?\?/.test(normalized)) warnings.push('Part of the ingredient text could not be read');
  const tokens = normalized.split(/[\s,;()[\]{}]+/).filter(Boolean);
  const junk = tokens.filter((t) => t.length >= 3 && !/\p{L}{2}/u.test(t) && !/^\d+(?:\.\d+)?%?$/.test(t));
  if (tokens.length > 0 && junk.length / tokens.length > 0.15) warnings.push('Much of the ingredient text did not parse');
  return warnings;
}

export function parseLabel(
  ingredientsText: string,
  detector: StatementDetector,
): ParsedLabel {
  const normalized = normalizeText(ingredientsText);
  const { rest, statements } = extractStatements(normalized, detector);
  const ingredientText = stripBoilerplate(rest);
  const { nodes, warnings } = parseIngredientTree(ingredientText);
  return { nodes, statements, warnings: [...warnings, ...unreadableWarnings(normalized)], ingredientText };
}

/** Walk all nodes depth-first. */
export function* walk(nodes: IngredientNode[]): Generator<IngredientNode> {
  for (const n of nodes) {
    yield n;
    yield* walk(n.children);
  }
}

/** "chocolate > milk" style path for evidence. */
export function nodeContext(node: IngredientNode): string {
  const names: string[] = [];
  let n: IngredientNode | null = node;
  while (n) {
    if (n.text) names.unshift(n.text);
    n = n.parent;
  }
  return names.join(' > ');
}
