import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze, markdown, mermaid } from '../src/analyzer.ts';
import { examples } from '../src/examples.ts';

const workflow = (body: string, prefix = 'on: push\npermissions: {}\n') => `${prefix}jobs:\n  test:\n    runs-on: ubuntu-latest\n${body}`;
test('untrusted PR checkout and direct script interpolation surface exact source lines', () => {
  const r = analyze(examples.risky);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.events, ['pull_request_target']);
  const f = r.findings.find(f => f.rule === 'script-injection')!;
  assert.equal(f.severity, 'high');
  assert.match(examples.risky.split('\n')[f.line - 1], /run: echo/);
  assert.ok(r.findings.some(f => f.rule === 'privileged-checkout'));
});
test('YAML 1.2 preserves the on key and scalar/list/map triggers', () => {
  for (const trigger of ['push', '[push, pull_request]', '{push: null, pull_request: null}']) {
    const r = analyze(workflow('    steps: []', `on: ${trigger}\n`));
    assert.deepEqual(r.errors, []); assert.ok(r.events.includes('push'));
  }
});
test('job permission override replaces workflow scopes rather than merging', () => {
  const r = analyze(workflow('    permissions:\n      contents: read\n    steps: []', 'on: push\npermissions: write-all\n'));
  assert.deepEqual(r.jobs[0].permissions, { contents: 'read' });
  assert.equal(r.jobs[0].inheritedPermissions, false);
  assert.ok(!r.findings.some(f => f.rule === 'write-token'));
});
test('empty permission mapping is explicit no access; absent declaration stays unknown', () => {
  assert.deepEqual(analyze(workflow('    steps: []')).jobs[0].permissions, {});
  assert.deepEqual(analyze(workflow('    steps: []', 'on: push\n')).jobs[0].permissions, { '*': 'unknown' });
});
test('full SHA is not flagged as mutable and local actions are not pinned', () => {
  const r = analyze(workflow(`    steps:\n      - uses: actions/checkout@${'a'.repeat(40)}\n        with:\n          persist-credentials: false\n      - uses: ./.github/actions/test`));
  assert.ok(!r.findings.some(f => ['unpinned-action', 'persist-credentials'].includes(f.rule)));
});
test('GitHub self-repository actions and workflows are treated as commit-pinned', () => {
  const action = analyze(workflow('    steps:\n      - uses: $/'));
  const reusable = analyze('on: push\njobs:\n  call:\n    uses: $/.github/workflows/reusable.yml');
  assert.ok(!action.findings.some(f => f.rule === 'unpinned-action'));
  assert.ok(!reusable.findings.some(f => f.rule === 'unpinned-workflow'));
});
test('quoted false does not silently disable credential persistence', () => {
  const r = analyze(workflow('    steps:\n      - uses: actions/checkout@v4\n        with:\n          persist-credentials: "false"'));
  assert.ok(r.findings.some(f => f.rule === 'persist-credentials'));
});
test('passing untrusted text through an environment variable avoids direct interpolation hint', () => {
  const r = analyze(workflow('    steps:\n      - env:\n          TITLE: ${{ github.event.pull_request.title }}\n        run: printf "%s" "$TITLE"'));
  assert.ok(!r.findings.some(f => f.rule === 'script-injection'));
});
test('trusted context in run does not produce untrusted context hint', () => {
  const r = analyze(workflow('    steps:\n      - run: echo "${{ github.sha }}"'));
  assert.ok(!r.findings.some(f => f.rule === 'script-injection'));
});
test('workflow and job environment secret refs are visible with overrides', () => {
  const r = analyze(workflow('    env:\n      SHARED: local\n    steps:\n      - run: echo ok\n        env:\n          TOKEN: ${{ secrets[\'TOKEN\'] }}', 'on: push\nenv:\n  SHARED: ${{ secrets.OVERRIDDEN }}\n  GLOBAL: ${{ secrets.GLOBAL }}\npermissions: {}\n'));
  assert.deepEqual(new Set(r.jobs[0].secrets), new Set(['TOKEN', 'GLOBAL']));
});
test('reusable workflows are not expanded and inherit is explicit', () => {
  const r = analyze(examples.reusable);
  assert.deepEqual(r.errors, []);
  assert.ok(r.jobs[1].reusable);
  assert.ok(r.findings.some(f => f.rule === 'inherit-secrets'));
  assert.ok(r.findings.some(f => f.rule === 'unpinned-workflow'));
  assert.ok(r.warnings.some(w => w.includes('not fetched')));
});
test('pull_request alone does not imply privileged checkout', () => {
  const r = analyze(examples.risky.replace('pull_request_target:', 'pull_request:'));
  assert.ok(!r.findings.some(f => f.rule === 'privileged-checkout'));
});
test('self-hosted runner on PR receives contextual review hint', () => {
  const r = analyze(workflow('    steps: []', 'on: pull_request\n').replace('ubuntu-latest', '[self-hosted, linux]'));
  assert.ok(r.findings.some(f => f.rule === 'self-hosted-pr'));
});
test('duplicate keys, aliases, custom tags, and multiple documents fail closed', () => {
  for (const s of ['on: push\non: pull_request\njobs: {}', 'on: push\njobs: &x {test: *x}', 'on: !custom push\njobs: {}', 'on: push\n---\non: push']) assert.ok(analyze(s).errors.length, s);
});
test('malformed YAML, missing jobs, missing runs-on, non-workflow input', () => {
  for (const s of ['jobs: [', 'on: push', 'hello', 'on: push\njobs:\n  bad:\n    steps: []', 'jobs: {a: 1}']) assert.ok(analyze(s).errors.length, s);
});
test('missing dependencies and cycles produce errors instead of a misleading graph', () => {
  assert.ok(analyze(workflow('    needs: missing\n    steps: []')).errors.some(e => e.includes('unknown')));
  assert.ok(analyze(workflow('    needs: test\n    steps: []')).errors.some(e => e.includes('cycle')));
});
test('bounded input and deep nesting do not crash reviewer', () => {
  assert.ok(analyze('x'.repeat(256_001)).errors.some(e => e.includes('limit')));
  assert.ok(analyze('on: push\njobs: {}\nextra: ' + '['.repeat(50) + '0' + ']'.repeat(50)).errors.length);
});
test('container digest is pinned while mutable tag gets a hint', () => {
  const r = analyze(workflow(`    steps:\n      - uses: docker://alpine@sha256:${'a'.repeat(64)}\n      - uses: docker://alpine:latest`));
  assert.equal(r.findings.filter(f => f.rule === 'unpinned-container').length, 1);
});
test('download-and-execute hint detects shell pipeline without flagging download alone', () => {
  const r = analyze(workflow('    steps:\n      - run: curl https://example.invalid/install.sh | bash\n      - run: curl -o file https://example.invalid/file'));
  assert.equal(r.findings.filter(f => f.rule === 'remote-script').length, 1);
});
test('report includes limitations and stable rule identifiers', () => {
  const r = markdown(analyze(examples.risky));
  assert.match(r, /not a security certification/); assert.match(r, /script-injection/); assert.match(r, /## Limits/);
});
test('CLI stdin JSON and opt-in failure behavior', () => {
  const json = spawnSync(process.execPath, ['src/cli.ts', '-', '--json'], { input: examples.risky, encoding: 'utf8' });
  assert.equal(json.status, 0); assert.equal(JSON.parse(json.stdout).jobs.length, 2);
  const high = spawnSync(process.execPath, ['src/cli.ts', '-', '--fail-on-high'], { input: examples.risky });
  assert.equal(high.status, 1);
  const invalid = spawnSync(process.execPath, ['src/cli.ts', '-'], { input: 'jobs: [' }); assert.equal(invalid.status, 2);
});

test('dynamic workflow env secrets remain visible alongside named references', () => {
  const r = analyze(workflow('    steps:\n      - run: echo ok\n        env:\n          TOKEN: ${{ secrets.TOKEN }}', 'on: push\nenv:\n  DYNAMIC: ${{ secrets[inputs.secret_name] }}\npermissions: {}\n'));
  assert.deepEqual(r.jobs[0].secrets, ['TOKEN', '(dynamic secret expression)']);
  const overridden = analyze(workflow('    env:\n      DYNAMIC: local\n    steps: []', 'on: push\nenv:\n  DYNAMIC: ${{ secrets[inputs.name] }}\n'));
  assert.deepEqual(overridden.jobs[0].secrets, []);
  for (const value of ["${{ secrets['TOKEN'] }}", '${{ secrets[ "TOKEN" ] }}']) {
    const literal = analyze(workflow(`    env:\n      TOKEN: ${value}\n    steps: []`));
    assert.ok(!literal.jobs[0].secrets.includes('(dynamic secret expression)'));
    assert.deepEqual(literal.jobs[0].secrets, ['TOKEN']);
  }
});

test('Mermaid preserves dependency direction and disconnected jobs with generated IDs', () => {
  const r = analyze('on: push\njobs:\n  end:\n    runs-on: ubuntu-latest\n    steps: []\n  deploy:\n    needs: end\n    runs-on: ubuntu-latest\n    steps: []\n  separate:\n    runs-on: ubuntu-latest\n    steps: []');
  const diagram = mermaid(r);
  assert.match(diagram, /job0\["end"\]/);
  assert.match(diagram, /job0 --> job1/);
  assert.match(diagram, /job2\["separate"\]/);
  assert.throws(() => mermaid(analyze('jobs: [')), /Fix workflow errors/);
});

test('exports keep hostile workflow labels inert and prevent fence escapes', () => {
  const hostile = '" ]\n```\n![track](https://example.invalid/pixel) <img src=x> & #quot;';
  const r = analyze(workflow('    steps: []'));
  r.name = hostile; r.jobs[0].name = hostile; r.jobs[0].runner = hostile;
  r.warnings.push(hostile);
  const diagram = mermaid(r);
  assert.ok(!diagram.includes('<img'));
  assert.ok(!diagram.includes('```'));
  assert.equal(diagram.split('\n').length, 4);
  const report = markdown(r);
  assert.equal((report.match(/```/g) || []).length, 2);
  assert.ok(!report.includes('![track]'));
  assert.ok(!report.includes('<img'));
  assert.match(report, /&#60;img/);
});

test('CLI diagram output and format conflicts have predictable exit codes', () => {
  const run = (args: string[], input = examples.minimal) => spawnSync(process.execPath, ['src/cli.ts', '-', ...args], { input, encoding: 'utf8' });
  const diagram = run(['--mermaid']);
  assert.equal(diagram.status, 0); assert.match(diagram.stdout, /^flowchart LR/);
  assert.equal(run(['--mermaid', '--json']).status, 2);
  const invalid = run(['--mermaid'], 'jobs: [');
  assert.equal(invalid.status, 2); assert.equal(invalid.stdout, ''); assert.ok(invalid.stderr);
  assert.equal(run(['--mermaid', '--fail-on-high'], examples.risky).status, 1);
});

test('CLI caps stdin before allocating an oversized workflow', () => {
  const result = spawnSync(process.execPath, ['src/cli.ts', '-'], { input: 'x'.repeat(256_001), encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /256 KB input limit/);
});

test('CLI rejects oversized workflow files before reading them', () => {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-large-file-'));
  const path = join(directory, 'large.yml');
  writeFileSync(path, 'x'.repeat(256_001));
  try {
    const result = spawnSync(process.execPath, ['src/cli.ts', path], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /256 KB input limit/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI reads valid workflow files from their file descriptor', () => {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-file-input-'));
  const path = join(directory, 'workflow.yml');
  writeFileSync(path, examples.minimal);
  try {
    const result = spawnSync(process.execPath, ['src/cli.ts', path, '--json'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).jobs.length, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI rejects directories before opening them as workflow files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-lens-directory-input-'));
  try {
    const result = spawnSync(process.execPath, ['src/cli.ts', directory], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /regular file/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('job-level container triggers unpinned hint unless digest-pinned', () => {
  const mutable = analyze(workflow('    container: node:latest\n    steps: []'));
  assert.ok(mutable.findings.some(f => f.rule === 'unpinned-container' && f.job === 'test'));
  const pinned = analyze(workflow(`    container: node@sha256:${'b'.repeat(64)}\n    steps: []`));
  assert.ok(!pinned.findings.some(f => f.rule === 'unpinned-container'));
});

test('script injection heuristic covers hyphenated action input keys', () => {
  for (const expression of ["inputs['release-channel']", "github.event.inputs['release-channel']"]) {
    const result = analyze(workflow(`    steps:\n      - run: echo "${'${{'} ${expression} }}"`));
    assert.ok(result.findings.some(f => f.rule === 'script-injection'), `${expression} should be flagged`);
  }
});

test('all supported untrusted event contexts detect script injection', () => {
  const expressions = [
    'github.event.pull_request.title',
    'github.event.pull_request.body',
    'github.event.pull_request.head.ref',
    'github.event.pull_request.head.label',
    'github.event.issue.title',
    'github.event.issue.body',
    'github.event.comment.body',
    'github.event.review_comment.body',
    'github.event.review.body',
    'github.event.discussion.title',
    'github.event.discussion.body',
    'github.event.head_commit.author.name',
    'github.event.head_commit.author.email',
    'github.event.head_commit.message',
    'github.event.workflow_run.head_branch',
    'github.event.workflow_run.display_title',
    'github.event.workflow_run.head_commit.message',
    'github.head_ref',
    'github.ref_name',
    'github.ref',
    'github.event.inputs.command',
    'inputs.command',
    "inputs['command']",
    'github.event.inputs["command"]',
  ];
  for (const expression of expressions) {
    const result = analyze(workflow(`    steps:\n      - run: echo "${'${{'} ${expression} }}"`));
    assert.ok(result.findings.some(f => f.rule === 'script-injection'), `${expression} should be flagged`);
  }
  const trusted = analyze(workflow('    steps:\n      - run: echo "${{ github.sha }} ${{ github.event.pull_request.number }}"'));
  assert.ok(!trusted.findings.some(f => f.rule === 'script-injection'));
  const invalidDiscussionCommentPath = analyze(workflow('    steps:\n      - run: echo "${{ github.event.discussion_comment.body }}"'));
  assert.ok(!invalidDiscussionCommentPath.findings.some(f => f.rule === 'script-injection'));
});

test('composite action passes workflow-controlled inputs through environment variables', () => {
  const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const runBlock = action.split('      run: |\n')[1];
  assert.ok(runBlock, 'action should define its run script');
  assert.doesNotMatch(runBlock, /\$\{\{/);
  assert.match(action, /WORKFLOW_LENS_WORKFLOW: \$\{\{ inputs\.workflow \}\}/);
  assert.match(action, /args=\("\$workflow_path"\)/);
  assert.match(action, /fromWorkspace\.startsWith\(`\.\.\$\{sep\}`\)/);
});

test('composite action rejects workflow paths that escape the checked-out workspace', () => {
  const action = readFileSync(new URL('../action.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const runBlock = action.split('      run: |\n')[1];
  const script = runBlock?.match(/workflow_path="\$\(\s*node -e '([\s\S]*?)'\s*\)"/)?.[1];
  assert.ok(script, 'action should validate its workflow path before installing dependencies');

  const parent = mkdtempSync(join(tmpdir(), 'workflow-lens-action-'));
  const workspace = join(parent, 'workspace');
  mkdirSync(workspace);
  writeFileSync(join(workspace, 'workflow.yml'), 'on: push\njobs: {}\n');
  writeFileSync(join(parent, 'outside.yml'), 'outside: true\n');
  try {
    const env = { ...process.env, GITHUB_WORKSPACE: workspace, WORKFLOW_LENS_WORKFLOW: 'workflow.yml' };
    const inside = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', env });
    assert.equal(inside.status, 0);
    assert.equal(inside.stdout, join(workspace, 'workflow.yml'));

    const outside = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', env: { ...env, WORKFLOW_LENS_WORKFLOW: '../outside.yml' } });
    assert.equal(outside.status, 2);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('remote script execution detects sudo flags and python piping', () => {
  const sudoScript = analyze(workflow('    steps:\n      - run: curl -fsSL https://example.invalid/install.sh | sudo -E bash -'));
  assert.ok(sudoScript.findings.some(f => f.rule === 'remote-script'));
  const pythonScript = analyze(workflow('    steps:\n      - run: wget -qO- https://example.invalid/run.py | python3'));
  assert.ok(pythonScript.findings.some(f => f.rule === 'remote-script'));
});
