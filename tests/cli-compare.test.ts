import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const source = `on: push
permissions: { contents: read }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo hello
`;

function run(args: string[], before = source, after = source, input?: string) {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-compare-'));
  try {
    writeFileSync(join(directory, 'before.yml'), before);
    writeFileSync(join(directory, 'after.yml'), after);
    return spawnSync(process.execPath, [cli, ...args], { cwd: directory, encoding: 'utf8', input, timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('CLI comparison exposes requested permission changes in JSON and Markdown', () => {
  const after = source.replace('contents: read', 'contents: write');
  const json = run(['after.yml', '--compare', 'before.yml', '--json'], source, after);
  assert.equal(json.status, 0, json.stderr);
  const result = JSON.parse(json.stdout);
  assert.equal(result.before.jobs[0].permissions.contents, 'read');
  assert.equal(result.after.jobs[0].permissions.contents, 'write');
  assert.ok(result.changes.some((change: { field: string }) => change.field === 'permissions'));
  const md = run(['--compare', 'before.yml', 'after.yml'], source, after);
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /Workflow Lens change review/);
  assert.match(md.stdout, /contents: read/);
  assert.match(md.stdout, /contents: write/);
  assert.match(md.stdout, /```mermaid/);
});

test('CLI comparison supports proposed stdin but not a stdin baseline', () => {
  const stdin = run(['-', '--compare', 'before.yml', '--json'], source, source, source);
  assert.equal(stdin.status, 0, stdin.stderr);
  assert.equal(JSON.parse(stdin.stdout).changes.length, 0);
  assert.equal(run(['after.yml', '--compare', '-']).status, 2);
});

test('either invalid comparison side exits 2 with diagnostics and no classifications', () => {
  for (const [before, after] of [['jobs: [', source], [source, 'jobs: ['], ['jobs: [', 'jobs: [']]) {
    const result = run(['after.yml', '--compare', 'before.yml', '--json'], before, after);
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(report.before.errors.length || report.after.errors.length);
    assert.deepEqual(report.changes, []);
    assert.deepEqual(report.addedFindings, []);
    assert.deepEqual(report.removedFindings, []);
  }
  assert.match(run(['after.yml', '--compare', 'before.yml'], 'jobs: [').stdout, /Comparison unavailable/);
});

test('fail-on-high checks all proposed high hints, including preexisting ones', () => {
  const high = source.replace('on: push', 'on: pull_request').replace('ubuntu-latest', 'self-hosted');
  const result = run(['after.yml', '--compare', 'before.yml', '--json', '--fail-on-high'], high, high);
  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).addedFindings, []);
  assert.equal(run(['after.yml', '--compare', 'before.yml'], high, high).status, 0);
  assert.equal(run(['after.yml', '--compare', 'before.yml', '--fail-on-high'], high, source).status, 0);
});

test('comparison rejects incompatible, duplicate, unknown and missing arguments', () => {
  for (const args of [
    ['after.yml', '--compare'], ['after.yml', '--compare', '--json'],
    ['after.yml', '--compare', 'before.yml', '--mermaid'],
    ['after.yml', '--compare', 'before.yml', '--compare', 'before.yml'],
    ['after.yml', '--compare', 'before.yml', '--json', '--json'],
    ['after.yml', '--compare', 'before.yml', '--unknown'],
    ['after.yml', '--compare', 'before.yml', 'extra.yml'],
  ]) assert.equal(run(args).status, 2, args.join(' '));
});

test('comparison baseline uses the same bounded regular-file input checks', () => {
  assert.equal(run(['after.yml', '--compare', '.']).status, 2);
  assert.equal(run(['after.yml', '--compare', 'missing.yml']).status, 2);
  const oversized = run(['after.yml', '--compare', 'before.yml'], 'x'.repeat(256001));
  assert.equal(oversized.status, 2);
  assert.match(oversized.stderr, /256 KB/);
  const help = run(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--compare/);
  assert.match(help.stdout, /including existing hints/);
});
