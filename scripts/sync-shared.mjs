#!/usr/bin/env node
// Copies the shared TypeScript packages into supabase/functions/_shared/ so Edge Functions (Deno)
// run the exact same code as the app. Run `npm run sync:shared` after editing a package.
// `--check` fails if the copies are out of date (used in CI).

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['packages/verdict-engine/src', 'supabase/functions/_shared/verdict-engine'],
  ['packages/verdict-engine/data/dictionary.json', 'supabase/functions/_shared/verdict-engine/dictionary.json'],
  ['packages/food-data/src', 'supabase/functions/_shared/food-data'],
];

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  if (statSync(dir).isFile()) return [dir];
  return readdirSync(dir).flatMap((f) => listFiles(join(dir, f)));
}

// In Deno there is no package resolution, so the food-data copy imports the engine copy by path.
function rewriteImports(dir) {
  for (const file of listFiles(dir)) {
    if (!file.endsWith('.ts')) continue;
    const text = readFileSync(file, 'utf8');
    const next = text.replaceAll("from '@allergy/verdict-engine'", "from '../verdict-engine/index.ts'");
    if (next !== text) writeFileSync(file, next);
  }
}

function copyAll(base) {
  for (const [from, to] of pairs) {
    const src = join(root, from);
    if (!existsSync(src)) continue;
    cpSync(src, join(base, to), { recursive: true });
  }
  rewriteImports(join(base, 'supabase/functions/_shared/food-data'));
}

const check = process.argv.includes('--check');
if (check) {
  const tmp = mkdtempSync(join(tmpdir(), 'sync-shared-'));
  copyAll(tmp);
  const expected = listFiles(join(tmp, 'supabase/functions/_shared'));
  const stale = [];
  for (const file of expected) {
    const rel = relative(tmp, file);
    const actual = join(root, rel);
    if (!existsSync(actual) || readFileSync(actual, 'utf8') !== readFileSync(file, 'utf8')) stale.push(rel);
  }
  rmSync(tmp, { recursive: true, force: true });
  if (stale.length) {
    console.error(`Out of date (run npm run sync:shared):\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log('Shared code in supabase/functions/_shared is up to date.');
} else {
  for (const [, to] of pairs) {
    if (!to.endsWith('.json')) rmSync(join(root, to), { recursive: true, force: true });
  }
  copyAll(root);
  console.log('Copied shared packages into supabase/functions/_shared.');
}
