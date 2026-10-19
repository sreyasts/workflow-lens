import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluate } from './evaluate.ts';

// Historical analyzer code runs locally, so use only a revision you trust.
const root = fileURLToPath(new URL('../', import.meta.url));
const revision = process.argv[2];
if (process.argv.length !== 3 || !revision || revision.startsWith('-')) {
  console.error('Usage: npm run evaluate:compare -- trusted-git-revision');
  process.exitCode = 2;
} else {
  const temporary = new URL(`../evaluation/.baseline-${randomUUID()}.ts`, import.meta.url);
  let created = false;
  try {
    const commit = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const source = execFileSync('git', ['show', `${commit}:src/analyzer.ts`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    writeFileSync(temporary, source, { flag: 'wx' }); created = true;
    const baseline = await evaluate(temporary);
    const current = await evaluate();
    console.log(JSON.stringify({ baselineCommit: commit, baseline, current }, null, 2));
    if (current.summary.passed !== current.summary.cases) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Comparison failed.'); process.exitCode = 2;
  } finally {
    if (created) unlinkSync(temporary);
  }
}
