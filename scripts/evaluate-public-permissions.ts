import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { compareWorkflows, comparisonMarkdown } from '../src/compare.ts';

interface Snapshot { commit: string; sha256: string; url: string }
interface Source {
  id: string; repository: string; pullRequest: number; title: string; source: string;
  mergedAt: string; path: string; before: Snapshot; after: Snapshot;
  license: { file: string; source: string; sha256: string };
}
interface JobLabel { id: string; before: string[]; after: string[] }
interface Label {
  id: string; judgment: string; reason: string; knownGain: boolean;
  workflowPermissionChange: boolean; jobs: JobLabel[];
}
const root = new URL('../evaluation/public-permissions/', import.meta.url);
const hash = (text: string): string => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');
const sources: Source[] = JSON.parse(read('sources.json'));
const labels: Label[] = JSON.parse(read('labels.json'));
const write = process.argv.slice(2).includes('--write');
if (process.argv.slice(2).some(arg => arg !== '--write') || process.argv.slice(2).length > 1) {
  throw new Error('Usage: node scripts/evaluate-public-permissions.ts [--write]');
}
const ids = sources.map(source => source.id);
if (ids.length === 0 || new Set(ids).size !== ids.length || !isDeepStrictEqual([...ids].sort(), labels.map(label => label.id).sort())) {
  throw new Error('Source and label IDs must be unique and match exactly.');
}
const rows = sources.map(source => {
  if (!/^[a-z0-9-]+$/.test(source.id) || !/^licenses\/[a-zA-Z0-9.-]+\.txt$/.test(source.license.file)) {
    throw new Error('Invalid local snapshot or license path.');
  }
  const before = read(`${source.id}/before.yml`);
  const after = read(`${source.id}/after.yml`);
  if (hash(before) !== source.before.sha256 || hash(after) !== source.after.sha256 ||
      hash(read(source.license.file)) !== source.license.sha256) {
    throw new Error(`Snapshot or license integrity mismatch: ${source.id}`);
  }
  const label = labels.find(label => label.id === source.id)!;
  const result = compareWorkflows(before, after);
  const errors = [...result.before.errors, ...result.after.errors];
  const actual = result.changes.filter(change => change.field === 'permissions')
    .map(change => ({ id: change.job!, before: change.before, after: change.after }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const expected = [...label.jobs].sort((a, b) => a.id.localeCompare(b.id));
  const workflowPermissionChange = result.changes.some(change => change.field === 'workflow permissions');
  const matches = errors.length === 0 && isDeepStrictEqual(actual, expected) &&
    workflowPermissionChange === label.workflowPermissionChange;
  const report = comparisonMarkdown(result);
  if (write) writeFileSync(new URL(`${source.id}/report.md`, root), report);
  else if (read(`${source.id}/report.md`).replace(/\r\n/g, '\n') !== report) {
    throw new Error(`Stale report: ${source.id}; run npm run evaluate:permissions -- --write`);
  }
  return {
    id: source.id, source: source.source, judgment: label.judgment, reasoning: label.reason,
    knownGain: label.knownGain, comparisonMatchesLabels: matches, errors,
    permissionChanges: actual, workflowPermissionChange,
    newReviewHints: result.addedFindings.length,
    hintCountProxyMissesKnownGain: label.knownGain && result.addedFindings.length === 0,
    reportSha256: hash(report),
  };
});
const output = {
  schemaVersion: 1,
  hashNormalization: 'CRLF normalized to LF before SHA-256; no other source edits',
  scope: 'Purposively selected public workflow pairs, same-maintainer labels; not independent validation, adoption, runtime-access analysis, or population accuracy.',
  classification: 'Judgments are manual labels checked against comparison rows, not an automatic gain classifier.',
  analyzerSha256: hash(readFileSync(new URL('../src/analyzer.ts', import.meta.url), 'utf8')),
  comparatorSha256: hash(readFileSync(new URL('../src/compare.ts', import.meta.url), 'utf8')),
  sourcesSha256: hash(read('sources.json')), labelsSha256: hash(read('labels.json')),
  summary: {
    workflowPairs: rows.length, pullRequests: new Set(sources.map(source => source.source)).size,
    repositories: new Set(sources.map(source => source.repository)).size,
    matched: rows.filter(row => row.comparisonMatchesLabels).length,
    knownGainPairs: rows.filter(row => row.knownGain).length,
    hintCountProxyMisses: rows.filter(row => row.hintCountProxyMissesKnownGain).length,
  },
  cases: rows,
};
const serialized = JSON.stringify(output, null, 2) + '\n';
if (write) writeFileSync(new URL('results.json', root), serialized);
else if (read('results.json').replace(/\r\n/g, '\n') !== serialized) {
  throw new Error('Stale results; run npm run evaluate:permissions -- --write and review the changes.');
}
console.log(JSON.stringify(output.summary));
console.log('Raw permission rows checked against manual labels; no workflow was executed.');
if (rows.some(row => !row.comparisonMatchesLabels)) process.exitCode = 1;
