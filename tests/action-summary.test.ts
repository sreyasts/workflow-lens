import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { examples } from '../src/examples.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const action = parse(readFileSync(new URL('../action.yml', import.meta.url), 'utf8'));
const bash = process.platform === 'win32'
  ? join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe')
  : 'bash';
const shellAvailable = spawnSync(bash, ['--version'], { encoding: 'utf8' }).status === 0;

function runAction(source: string, options: { format?: string; failOnHigh?: boolean; summary?: string; summaryPath?: 'absent' | 'directory' } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-summary-'));
  const summaryPath = join(directory, 'summary.md');
  writeFileSync(join(directory, 'workflow.yml'), source);
  writeFileSync(summaryPath, 'Existing summary\n\n');
  try {
    // Exercise the action's real shell and CLI, without reinstalling or rebuilding per case.
    const result = spawnSync(bash, ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', `npm() { :; }\n${action.runs.steps[0].run}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        GITHUB_WORKSPACE: directory.replace(/\\/g, '/'),
        GITHUB_ACTION_PATH: root.replace(/\\/g, '/'),
        GITHUB_STEP_SUMMARY: options.summaryPath === 'absent' ? '' : (options.summaryPath === 'directory' ? directory : summaryPath).replace(/\\/g, '/'),
        WORKFLOW_LENS_WORKFLOW: 'workflow.yml',
        WORKFLOW_LENS_FORMAT: options.format || 'markdown',
        WORKFLOW_LENS_FAIL_ON_HIGH: options.failOnHigh ? 'true' : 'false',
        WORKFLOW_LENS_SUMMARY: options.summary ?? 'true',
      },
    });
    return { ...result, summary: readFileSync(summaryPath, 'utf8') };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('action appends a Markdown job summary while preserving existing content', { skip: !shellAvailable }, () => {
  assert.equal(action.inputs.summary.default, 'true');
  const result = runAction(examples.minimal);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.summary, /^Existing summary\n\n# Workflow Lens:/);
  assert.match(result.summary, /```mermaid\nflowchart LR/);
  assert.match(result.summary, /not a security certification/);
  assert.equal(result.summary, `Existing summary\n\n${result.stdout}`);
});

test('action retains high-hint failure after writing a review summary', { skip: !shellAvailable }, () => {
  const result = runAction(examples.risky, { failOnHigh: true });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.summary, /HIGH:/);
  assert.match(result.summary, /privileged-checkout/);
});

test('action preserves parse-error exit and shows the error in its summary', { skip: !shellAvailable }, () => {
  const result = runAction('jobs: [');
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.summary, /ERROR:/);
  assert.doesNotMatch(result.summary, /```mermaid/);
});

test('JSON and Mermaid log formats still produce Markdown job summaries', { skip: !shellAvailable }, () => {
  for (const format of ['json', 'mermaid']) {
    const result = runAction(examples.minimal, { format });
    assert.equal(result.status, 0, result.stderr);
    if (format === 'json') assert.ok(Array.isArray(JSON.parse(result.stdout).jobs));
    else assert.match(result.stdout, /^flowchart LR/);
    assert.match(result.summary, /# Workflow Lens:/);
    assert.match(result.summary, /```mermaid/);
  }
});

test('summary opt-out leaves the job summary untouched without hiding log output', { skip: !shellAvailable }, () => {
  const result = runAction(examples.minimal, { summary: 'false' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.summary, 'Existing summary\n\n');
  assert.match(result.stdout, /^# Workflow Lens:/);
});

test('invalid summary input fails before analysis and cannot become shell code', { skip: !shellAvailable }, () => {
  const result = runAction(examples.minimal, { summary: 'true; echo injected' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /summary must be true or false/);
  assert.equal(result.summary, 'Existing summary\n\n');
  assert.equal(result.stdout, '');
});

test('absent job-summary environment keeps the action usable', { skip: !shellAvailable }, () => {
  const result = runAction(examples.minimal, { summaryPath: 'absent' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.summary, 'Existing summary\n\n');
  assert.match(result.stdout, /^# Workflow Lens:/);
});

test('summary write failure warns without masking success or analyzer failure', { skip: !shellAvailable }, () => {
  for (const [source, expectedStatus] of [[examples.minimal, 0], [examples.risky, 1], ['jobs: [', 2]] as const) {
    const result = runAction(source, { failOnHigh: true, summaryPath: 'directory' });
    assert.equal(result.status, expectedStatus, result.stderr);
    assert.match(result.stderr, /could not write the job summary/);
    assert.match(result.stdout, /^# Workflow Lens:/);
  }
});

test('workflow names and job labels remain inert in the action summary', { skip: !shellAvailable }, () => {
  const hostile = '"]\n```\n![track](https://example.invalid/pixel) <img src=x>';
  const source = `name: ${JSON.stringify(hostile)}\non: push\npermissions: {}\njobs:\n  test:\n    name: ${JSON.stringify(hostile)}\n    runs-on: ubuntu-latest\n    steps: []\n`;
  const result = runAction(source);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.summary, /!\[track\]|<img/);
  assert.match(result.summary, /&#60;img/);
  assert.equal((result.summary.match(/```/g) || []).length, 2);
  assert.equal(result.summary, `Existing summary\n\n${result.stdout}`);
});
