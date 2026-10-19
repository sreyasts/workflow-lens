import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stringify } from 'yaml';
import type { Analysis } from '../src/analyzer.ts';

type Split = 'development' | 'confirmation';
interface Case {
  id: string; split: Split; event: string; uses?: string;
  with: Record<string, string>; expected: boolean; reason: string;
}
interface Outcome {
  id: string; split: Split; expected: boolean; actual: boolean;
  errors: string[]; passed: boolean; reason: string;
}
const hash = (value: string): string => createHash('sha256').update(value.replace(/\r\n/g, '\n')).digest('hex');
const defaultAnalyzer = new URL('../src/analyzer.ts', import.meta.url);
const fixtureURL = new URL('../evaluation/privileged-checkout.json', import.meta.url);

export function summarize(cases: Outcome[]) {
  const valid = cases.filter(c => c.errors.length === 0);
  const tp = valid.filter(c => c.expected && c.actual).length;
  const fp = valid.filter(c => !c.expected && c.actual).length;
  const tn = valid.filter(c => !c.expected && !c.actual).length;
  const fn = valid.filter(c => c.expected && !c.actual).length;
  return {
    cases: cases.length, passed: cases.filter(c => c.passed).length,
    inputErrors: cases.length - valid.length,
    truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
  };
}

export async function evaluate(analyzerURL = defaultAnalyzer, split?: Split) {
  const fixtureText = readFileSync(fixtureURL, 'utf8');
  const fixtures: Case[] = JSON.parse(fixtureText);
  const ids = new Set<string>();
  for (const c of fixtures) {
    if (!c || typeof c.id !== 'string' || ids.has(c.id) ||
      !['development', 'confirmation'].includes(c.split) || typeof c.expected !== 'boolean' ||
      typeof c.event !== 'string' || typeof c.reason !== 'string' || !c.reason.trim() ||
      !c.with || Array.isArray(c.with) || typeof c.with !== 'object' ||
      Object.values(c.with).some(v => typeof v !== 'string') ||
      (c.uses !== undefined && typeof c.uses !== 'string')) {
      throw new Error('Invalid or duplicate evaluation case.');
    }
    ids.add(c.id);
  }
  const { analyze } = await import(analyzerURL.href) as { analyze: (source: string) => Analysis };
  if (typeof analyze !== 'function') throw new Error('Analyzer module must export analyze(source).');
  const cases: Outcome[] = fixtures.filter(c => !split || c.split === split).map(c => {
    const source = stringify({
      name: c.id, on: c.event, permissions: {},
      jobs: { review: { 'runs-on': 'ubuntu-latest', steps: [{
        uses: c.uses ?? `actions/checkout@${'a'.repeat(40)}`,
        with: { 'persist-credentials': false, ...c.with },
      }] } },
    });
    const result = analyze(source);
    const actual = result.findings.some(f => f.rule === 'privileged-checkout');
    return { id: c.id, split: c.split, expected: c.expected, actual,
      errors: result.errors, passed: result.errors.length === 0 && actual === c.expected, reason: c.reason };
  });
  return {
    schemaVersion: 1, rule: 'privileged-checkout',
    fixtureSha256: hash(fixtureText), analyzerSha256: hash(readFileSync(analyzerURL, 'utf8')),
    hashNormalization: 'CRLF line endings normalized to LF before SHA-256',
    scope: 'Synthetic rule-presence checks; same-author labels; no workflow execution or general security accuracy claim.',
    summary: summarize(cases),
    splits: {
      development: summarize(cases.filter(c => c.split === 'development')),
      confirmation: summarize(cases.filter(c => c.split === 'confirmation')),
    },
    cases,
  };
}

async function main() {
  let analyzer = defaultAnalyzer; let split: Split | undefined; let json = false; let allowFailures = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (arg === '--allow-failures') allowFailures = true;
    else if (arg === '--analyzer' && args[i + 1]) analyzer = pathToFileURL(resolve(args[++i]));
    else if (arg === '--split' && ['development', 'confirmation'].includes(args[i + 1])) split = args[++i] as Split;
    else throw new Error('Usage: npm run evaluate -- [--json] [--split development|confirmation] [--analyzer path] [--allow-failures]');
  }
  const result = await evaluate(analyzer, split);
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`${result.rule}: ${result.summary.passed}/${result.summary.cases} case expectations met`);
    console.log(JSON.stringify(result.summary));
    for (const c of result.cases.filter(c => !c.passed)) {
      console.log(`${c.id}: expected=${c.expected} actual=${c.actual}${c.errors.length ? ` errors=${c.errors.join('; ')}` : ''}`);
    }
  }
  if (!allowFailures && result.summary.passed !== result.summary.cases) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed.'); process.exitCode = 2; });
}
