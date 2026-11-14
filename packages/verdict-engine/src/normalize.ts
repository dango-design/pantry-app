// Text clean-up before parsing. Keeps character positions meaningful only within the normalized text.

/** Lowercase, unify punctuation, collapse whitespace and repair a few common OCR slips. */
export function normalizeText(input: string): string {
  // NFKC folds ligatures; NFKD + dropping marks turns "piñon" into "pinon" so terms match either way.
  let s = input.normalize('NFKC').normalize('NFKD').replace(/\p{M}+/gu, '');
  // A word split across lines by a hyphen: "whe-\nat" -> "wheat".
  s = s.replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2');
  s = s.toLowerCase();
  s = s
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[•·●▪∙]/g, ',')
    .replace(/ /g, ' ');
  // OCR often reads "l" as "|" and "o" as "0" inside words: "mi|k", "s0y".
  s = s.replace(/(?<=\p{L})\|(?=\p{L})/gu, 'l');
  s = s.replace(/(?<=\p{L})0(?=\p{L})/gu, 'o');
  // Footnote markers carry no meaning for matching.
  s = s.replace(/[*†‡§]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Lowercased word tokens, for comparing two ingredient texts. */
export function wordTokens(text: string): string[] {
  return normalizeText(text).match(/\p{L}[\p{L}\p{N}'-]*/gu) ?? [];
}

/** Jaccard similarity of the word sets of two texts, 0..1. */
export function textSimilarity(a: string, b: string): number {
  const sa = new Set(wordTokens(a));
  const sb = new Set(wordTokens(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}
