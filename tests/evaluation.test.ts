import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluate, summarize } from '../scripts/evaluate.ts';
import { analyze } from '../src/analyzer.ts';
import { stringify } from 'yaml';

test('workflow_run head repository selection remains a checkout trust-review signal', () => {
  for (const repository of [
    '${{ github.event.workflow_run.head_repository.full_name }}',
    "${{ github['event']['workflow_run']['head_repository']['full_name'] }}",
  ]) {
    const result = analyze(stringify({ on: 'workflow_run', permissions: {}, jobs: {
      review: { 'runs-on': 'ubuntu-latest', steps: [{ uses: 'actions/checkout@v4', with: { repository } }] },
    } }));
    assert.deepEqual(result.errors, []);
    assert.ok(result.findings.some(f => f.rule === 'privileged-checkout'), repository);
  }
});

test('privileged-checkout evaluation meets all declared expectations without parse errors', async () => {
  const result = await evaluate();
  assert.equal(result.summary.cases, 20);
  assert.equal(result.summary.passed, 20, JSON.stringify(result.cases.filter(c => !c.passed)));
  assert.equal(result.summary.inputErrors, 0);
  assert.equal(result.summary.truePositives, 10);
  assert.equal(result.summary.trueNegatives, 10);
  assert.equal(result.splits.development.cases, 12);
  assert.equal(result.splits.confirmation.cases, 8);
});

test('evaluation excludes parse failures from classification metrics and preserves failures', () => {
  const base = { id: 'case', split: 'development' as const, errors: [], reason: 'test' };
  const result = summarize([
    { ...base, expected: true, actual: true, passed: true },
    { ...base, expected: false, actual: true, passed: false },
    { ...base, expected: false, actual: false, passed: true },
    { ...base, expected: true, actual: false, passed: false },
    { ...base, expected: false, actual: false, passed: false, errors: ['Invalid YAML'] },
  ]);
  assert.equal(result.inputErrors, 1);
  assert.equal(result.passed, 2);
  assert.equal(result.truePositives, 1);
  assert.equal(result.falsePositives, 1);
  assert.equal(result.trueNegatives, 1);
  assert.equal(result.falseNegatives, 1);
  assert.equal(result.precision, 0.5);
  assert.equal(result.recall, 0.5);
  assert.equal(summarize([]).precision, null);
  assert.equal(summarize([]).recall, null);
});

test('evaluation CLI rejects unknown options and invalid splits', () => {
  for (const args of [['--unknown'], ['--split', 'typo'], ['--analyzer']]) {
    const result = spawnSync(process.execPath, ['scripts/evaluate.ts', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
    assert.equal(result.stdout, '');
  }
});

test('evaluation CLI fails mismatches and only allows them with an explicit flag', () => {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-evaluation-'));
  try {
    const analyzer = join(directory, 'no-findings.mjs');
    writeFileSync(analyzer, 'export const analyze = () => ({ findings: [], errors: [] });');
    const args = ['scripts/evaluate.ts', '--analyzer', analyzer, '--json'];
    const failed = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).summary.falseNegatives, 10);
    const allowed = spawnSync(process.execPath, [...args, '--allow-failures'], { encoding: 'utf8' });
    assert.equal(allowed.status, 0);
    assert.equal(JSON.parse(allowed.stdout).summary.passed, 10);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
