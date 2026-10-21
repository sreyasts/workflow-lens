import test from 'node:test';
import assert from 'node:assert/strict';
import { stringify } from 'yaml';
import { compareWorkflows, comparisonMarkdown } from '../src/compare.ts';
import { examples } from '../src/examples.ts';

function source(job: Record<string, unknown> = {}, root: Record<string, unknown> = {}): string {
  return stringify({ name: 'Review', on: 'push', permissions: { contents: 'read' },
    jobs: { build: { 'runs-on': 'ubuntu-latest', steps: [{ run: 'echo ok' }], ...job } }, ...root });
}

test('identical inputs and formatting, mapping order, event/dependency order changes have no deltas', () => {
  const before = 'name: Review\non: [push, pull_request]\npermissions: {contents: read, actions: read}\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: []\n  test:\n    runs-on: ubuntu-latest\n    steps: []\n  report:\n    needs: [build, test]\n    runs-on: ubuntu-latest\n    steps: []\n';
  const after = '# moved lines\n' + before.replace('[push, pull_request]', '[pull_request, push]')
    .replace('{contents: read, actions: read}', '{actions: read, contents: read}')
    .replace('[build, test]', '[test, build]');
  for (const candidate of [before, after]) {
    const result = compareWorkflows(before, candidate);
    assert.deepEqual(result.before.errors, []);
    assert.deepEqual(result.after.errors, []);
    assert.deepEqual(result.changes, []);
    assert.deepEqual(result.addedFindings, []);
    assert.deepEqual(result.removedFindings, []);
  }
});

test('read to write requests and newly added event triggers are explicit', () => {
  const result = compareWorkflows(source(), source({ permissions: { contents: 'write', 'id-token': 'write' } }, { on: ['push', 'pull_request_target'] }));
  assert.deepEqual(result.changes.find(change => change.field === 'events'), { field: 'events', before: ['push'], after: ['pull_request_target', 'push'] });
  const permissions = result.changes.find(change => change.field === 'permissions')!;
  assert.equal(permissions.job, 'build');
  assert.ok(permissions.line! > 0);
  assert.deepEqual(permissions.before, ['inherited workflow default', 'contents: read']);
  assert.deepEqual(permissions.after, ['job override', 'contents: write', 'id-token: write']);
  assert.ok(result.addedFindings.some(finding => finding.rule === 'write-token'));
});

test('absent permissions stay unknown and differ from an explicit empty map', () => {
  const before = source().replace('permissions:\n  contents: read\n', '');
  const result = compareWorkflows(before, source({}, { permissions: {} }));
  const permissions = result.changes.find(change => change.field === 'permissions')!;
  assert.deepEqual(permissions.before, ['inherited workflow default', '*: unknown']);
  assert.deepEqual(permissions.after, ['inherited workflow default', 'no token scopes requested']);
  assert.match(comparisonMarkdown(result), /requested scopes, not effective runtime access/);
});

test('an identical permission map with a different inheritance source is reported', () => {
  const result = compareWorkflows(source(), source({ permissions: { contents: 'read' } }));
  assert.deepEqual(result.changes.map(change => change.field), ['permissions']);
  assert.equal(result.changes[0].before[0], 'inherited workflow default');
  assert.equal(result.changes[0].after[0], 'job override');
});

test('workflow defaults change even when all jobs override them, without changing job-requested scopes', () => {
  const job = { permissions: { contents: 'read' } };
  const result = compareWorkflows(source(job), source(job, { permissions: { contents: 'write', 'id-token': 'write' } }));
  assert.deepEqual(result.changes, [{ field: 'workflow permissions', before: ['contents: read'], after: ['contents: write', 'id-token: write'] }]);
  assert.deepEqual(result.before.jobs[0].permissions, result.after.jobs[0].permissions);
  assert.deepEqual(result.before.workflowPermissions, { contents: 'read' });
  assert.deepEqual(result.after.workflowPermissions, { contents: 'write', 'id-token': 'write' });
  assert.ok(!result.addedFindings.some(finding => finding.rule === 'write-token'));
});

test('job overrides remain replacements and do not acquire workflow-only scopes', () => {
  const result = compareWorkflows(source(), source({ permissions: { contents: 'read' } }, { permissions: { 'id-token': 'write' } }));
  assert.deepEqual(result.after.jobs[0].permissions, { contents: 'read' });
  assert.ok(!result.changes.find(change => change.field === 'permissions')?.after.some(value => value.includes('id-token')));
});

test('job IDs added and removed are recorded without inventing continuity for a rename', () => {
  const before = source();
  const result = compareWorkflows(before, before.replace('  build:', '  renamed:'));
  assert.deepEqual(result.changes, [{ field: 'jobs', before: ['build'], after: ['renamed'] }]);
  assert.ok(result.warnings.some(warning => warning.includes('renaming an ID')));
});

test('common job name, runner, condition, dependency, secrets and step-count changes are visible', () => {
  const before = source({}, { jobs: {
    build: { 'runs-on': 'ubuntu-latest', steps: [] },
    deploy: { 'runs-on': 'ubuntu-latest', steps: [] },
  } });
  const after = source({}, { jobs: {
    build: { 'runs-on': 'ubuntu-latest', steps: [] },
    deploy: { name: 'Release', 'runs-on': 'windows-latest', needs: ['build'], if: "github.ref == 'refs/heads/main'", steps: [{ run: 'echo done', env: { TOKEN: '${{ secrets.DEPLOY }}' } }] },
  } });
  const result = compareWorkflows(before, after);
  assert.deepEqual(result.after.errors, []);
  assert.deepEqual(result.changes.map(change => change.field).sort(), ['condition', 'name', 'needs', 'runner', 'secrets', 'steps']);
  assert.ok(result.changes.every(change => change.job === 'deploy'));
});

test('object-form runner mapping key order does not create a difference', () => {
  const result = compareWorkflows(
    source({ 'runs-on': { group: 'build-runners', labels: ['linux', 'x64'] } }),
    source({ 'runs-on': { labels: ['linux', 'x64'], group: 'build-runners' } }),
  );
  assert.deepEqual(result.changes, []);
});

test('action references retain duplicates and report reordering', () => {
  const steps = [{ uses: 'example/first@v1' }, { uses: 'example/second@v1' }, { uses: 'example/first@v1' }];
  const reordered = compareWorkflows(source({ steps }), source({ steps: [steps[1], steps[0], steps[2]] }));
  const actions = reordered.changes.find(change => change.field === 'actions')!;
  assert.deepEqual(actions.before, ['example/first@v1', 'example/second@v1', 'example/first@v1']);
  assert.deepEqual(actions.after, ['example/second@v1', 'example/first@v1', 'example/first@v1']);
  assert.deepEqual(reordered.addedFindings, []);
  assert.deepEqual(reordered.removedFindings, []);
});

test('hint matching ignores moved lines and inserted harmless steps', () => {
  const before = source({ steps: [{ run: 'echo "${{ github.event.issue.title }}"' }] });
  const after = '# comment\n\n' + source({ steps: [{ run: 'echo harmless' }, { run: 'echo "${{ github.event.issue.title }}"' }] });
  const result = compareWorkflows(before, after);
  assert.deepEqual(result.addedFindings, []);
  assert.deepEqual(result.removedFindings, []);
  assert.deepEqual(result.changes.map(change => change.field), ['steps']);
});

test('duplicate identical hints are counted rather than collapsed', () => {
  const step = { run: 'echo "${{ github.event.issue.title }}"' };
  const before = source({ steps: [step, { ...step }] });
  const after = source({ steps: [step] });
  const result = compareWorkflows(before, after);
  assert.equal(result.removedFindings.filter(finding => finding.rule === 'script-injection').length, 1);
  assert.deepEqual(result.addedFindings, []);
  const reversed = compareWorkflows(after, before);
  assert.equal(reversed.addedFindings.filter(finding => finding.rule === 'script-injection').length, 1);
  assert.deepEqual(reversed.removedFindings, []);
});

test('new and no-longer-matching hints preserve their respective source locations', () => {
  const result = compareWorkflows(examples.minimal, examples.risky);
  assert.ok(result.addedFindings.some(finding => finding.rule === 'script-injection'));
  assert.ok(result.addedFindings.every(finding => result.after.findings.includes(finding)));
  const report = comparisonMarkdown(result);
  assert.match(report, /Newly matching review hints/);
  assert.match(report, /after line \d+/);
  const reversed = compareWorkflows(examples.risky, examples.minimal);
  assert.match(comparisonMarkdown(reversed), /before line \d+/);
});

test('calling a reusable workflow is marked without pretending its body is expanded', () => {
  const result = compareWorkflows(source(), source({}, { jobs: { build: { uses: 'example/automation/.github/workflows/test.yml@main' } } }));
  assert.ok(result.changes.some(change => change.field === 'reusable' && change.before[0] === 'false' && change.after[0] === 'true'));
  assert.ok(result.warnings.some(warning => warning.includes('not fetched or expanded')));
});

test('reusable workflow callee-reference changes are visible without expansion', () => {
  const before = source({}, { jobs: { build: { uses: 'example/automation/.github/workflows/test.yml@v1' } } });
  const after = before.replace('@v1', '@v2');
  const result = compareWorkflows(before, after);
  assert.deepEqual(result.changes, [{ job: 'build', field: 'workflow reference', before: ['example/automation/.github/workflows/test.yml@v1'], after: ['example/automation/.github/workflows/test.yml@v2'], line: result.after.jobs[0].line }]);
  assert.equal(result.after.jobs[0].workflowRef, 'example/automation/.github/workflows/test.yml@v2');
});

test('boolean job conditions distinguish false, true and an absent condition', () => {
  for (const [previous, current, expectedBefore, expectedAfter] of [
    [false, true, ['false'], ['true']],
    [false, undefined, ['false'], []],
    [undefined, false, [], ['false']],
  ] as const) {
    const result = compareWorkflows(source(previous === undefined ? {} : { if: previous }), source(current === undefined ? {} : { if: current }));
    const condition = result.changes.find(change => change.field === 'condition')!;
    assert.deepEqual(condition.before, expectedBefore);
    assert.deepEqual(condition.after, expectedAfter);
  }
});

test('invalid input on either side suppresses all field and hint classifications', () => {
  for (const [before, after] of [['jobs: [', examples.risky], [examples.risky, 'jobs: ['], ['jobs: [', '']]) {
    const result = compareWorkflows(before, after);
    assert.deepEqual(result.changes, []);
    assert.deepEqual(result.addedFindings, []);
    assert.deepEqual(result.removedFindings, []);
    const report = comparisonMarkdown(result);
    assert.match(report, /Comparison unavailable/);
    assert.match(report, /## (Before|After) errors/);
    assert.doesNotMatch(report, /No listed field differences|## Newly matching/);
  }
});

test('scripts and trigger-filter changes outside the projection cannot imply equivalence', () => {
  const before = source({}, { on: { push: { paths: ['src/**'] } } });
  const after = source({ steps: [{ run: 'a completely different command' }] }, { on: { push: { paths: ['**'] } } });
  const result = compareWorkflows(before, after);
  assert.deepEqual(result.changes, []);
  assert.deepEqual(result.addedFindings, []);
  const report = comparisonMarkdown(result);
  assert.match(report, /Other workflow behavior may have changed/);
  assert.match(report, /Scripts, action inputs, trigger filters, matrices/);
  assert.match(report, /not mean equivalent behavior or safety/);
});

test('hostile workflow names, job labels, values and diagnostics cannot inject report markup', () => {
  const hostile = '" ]\n```\n![track](https://example.invalid/pixel) <img src=x> | # Heading';
  const result = compareWorkflows(source(), source({ name: hostile, 'runs-on': hostile }, { name: hostile }));
  const report = comparisonMarkdown(result);
  assert.doesNotMatch(report, /```|!\[track\]|<img|\n# Heading/);
  assert.match(report, /&#60;img/);
  const invalid = compareWorkflows(source(), 'jobs: [');
  invalid.after.errors.push(hostile);
  assert.doesNotMatch(comparisonMarkdown(invalid), /```|!\[track\]|<img/);
});
