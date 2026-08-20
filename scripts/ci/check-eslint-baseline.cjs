#!/usr/bin/env node
// Runs eslint fresh and compares its output against .eslint-baseline.json.
// Fails (non-zero exit) only if a violation exists that is NOT in the baseline —
// i.e. only on NEW problems, not the 322 that already existed when the baseline
// was captured (2026-08-20, see audit/07_ROADMAP_MVP.md Phase 0 décision 7: a
// permanently-red lint is a lint nobody reads, so freeze what's there today and
// make new violations the thing that actually blocks CI).
//
// Usage:
//   node scripts/ci/check-eslint-baseline.cjs            # compare against baseline
//   node scripts/ci/check-eslint-baseline.cjs --generate  # (re)write the baseline

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(repoRoot, '.eslint-baseline.json');
const isGenerate = process.argv.includes('--generate');

function runEslint() {
  let raw;
  try {
    raw = execFileSync(
      'npx',
      ['eslint', '.', '--ext', '.ts,.tsx', '--format', 'json'],
      { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, shell: true }
    );
  } catch (e) {
    // eslint exits non-zero when it finds problems; stdout still has the JSON.
    raw = e.stdout;
  }
  if (!raw) {
    console.error('eslint produced no stdout to parse. stderr was:', raw && raw.stderr);
    process.exit(1);
  }
  return JSON.parse(raw);
}

// Key deliberately excludes line/column so unrelated edits elsewhere in a file
// don't make an existing (baselined) violation look "new" just because it moved.
function keyOf(filePath, message) {
  const relPath = path.relative(repoRoot, filePath).split(path.sep).join('/');
  return `${relPath}::${message.ruleId || '(no-ruleId)'}::${message.message}`;
}

function toKeySet(eslintResults) {
  const set = new Set();
  for (const file of eslintResults) {
    for (const msg of file.messages) {
      set.add(keyOf(file.filePath, msg));
    }
  }
  return set;
}

const results = runEslint();
const currentKeys = toKeySet(results);

if (isGenerate) {
  fs.writeFileSync(baselinePath, JSON.stringify([...currentKeys].sort(), null, 2) + '\n');
  console.log(`Baseline written: ${currentKeys.size} known problems recorded in .eslint-baseline.json`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error('No .eslint-baseline.json found. Run with --generate first.');
  process.exit(1);
}

const baselineKeys = new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')));
const newKeys = [...currentKeys].filter(k => !baselineKeys.has(k));

console.log(`eslint: ${currentKeys.size} total problems (${baselineKeys.size} baselined, ${newKeys.length} new).`);

if (newKeys.length > 0) {
  console.error('\nNEW eslint problems not present in the baseline (these block CI):\n');
  for (const k of newKeys) {
    console.error(`  - ${k}`);
  }
  console.error('\nEither fix these, or if genuinely acceptable, regenerate the baseline deliberately:');
  console.error('  node scripts/ci/check-eslint-baseline.cjs --generate');
  process.exit(1);
}

console.log('No new eslint problems. (Existing baselined problems are unaffected — see .eslint-baseline.json.)');
process.exit(0);
