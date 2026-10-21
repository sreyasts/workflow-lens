import { analyze, type Analysis, type Finding, type Job } from './analyzer.ts';

export interface WorkflowChange {
  job?: string;
  field: string;
  before: string[];
  after: string[];
  line?: number;
}

export interface WorkflowComparison {
  before: Analysis;
  after: Analysis;
  changes: WorkflowChange[];
  addedFindings: Finding[];
  removedFindings: Finding[];
  warnings: string[];
}

const limits = [
  'Only the listed analyzer fields are compared. Scripts, action inputs, trigger filters, matrices, environments, containers, and other YAML changes may be omitted; no listed differences does not mean equivalent behavior or safety.',
  'Permissions are requested scopes, not effective runtime access. Repository defaults, event restrictions, organization policies, and external actions are not resolved.',
  'Job IDs identify jobs; renaming an ID appears as a removed and added job. Conditions are compared as text, not evaluated. Action references retain their order and duplicates; action behavior is not inspected.',
  'Hint differences match rule, severity, job, detail, and advice as a multiset, ignoring line and step positions. Identical hints in different steps cannot be distinguished; a disappearing hint does not prove a security issue was fixed.',
];

const asSet = (values: string[]): string[] => [...new Set(values)].sort();
const same = (before: string[], after: string[]): boolean => before.length === after.length && before.every((value, index) => value === after[index]);
const permissionScopes = (permissions: Record<string, string>): string[] => Object.keys(permissions).length
  ? Object.keys(permissions).sort().map(scope => `${scope}: ${permissions[scope]}`)
  : ['no token scopes requested'];
const permissionValues = (job: Job): string[] => [
  job.inheritedPermissions ? 'inherited workflow default' : 'job override', ...permissionScopes(job.permissions),
];

function runnerValue(runner: string): string {
  // Object-form runner labels are serialized by the analyzer; mapping key order has no meaning.
  if (!runner.startsWith('{')) return runner;
  try {
    const value: unknown = JSON.parse(runner);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)));
    }
  } catch { /* Non-JSON runner text remains a literal, unresolved value. */ }
  return runner;
}

const findingKey = (finding: Finding): string => JSON.stringify([
  finding.rule, finding.severity, finding.job ?? null, finding.detail, finding.advice,
]);

function unmatchedFindings(candidates: Finding[], reference: Finding[]): Finding[] {
  const remaining = new Map<string, number>();
  for (const finding of reference) {
    const key = findingKey(finding);
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  return candidates.filter(finding => {
    const key = findingKey(finding);
    const count = remaining.get(key) ?? 0;
    if (!count) return true;
    remaining.set(key, count - 1);
    return false;
  });
}

/** Compare bounded analyzer projections without executing either workflow. */
export function compareWorkflows(beforeSource: string, afterSource: string): WorkflowComparison {
  const before = analyze(beforeSource);
  const after = analyze(afterSource);
  const result: WorkflowComparison = {
    before, after, changes: [], addedFindings: [], removedFindings: [],
    warnings: [...new Set([...limits, ...before.warnings, ...after.warnings])],
  };
  if (before.errors.length || after.errors.length) {
    result.warnings.unshift('Comparison unavailable: fix errors in both workflows before reviewing differences.');
    return result;
  }
  const add = (field: string, previous: string[], current: string[], job?: Job) => {
    if (!same(previous, current)) result.changes.push({ field, before: previous, after: current,
      ...(job ? { job: job.id, line: job.line } : {}) });
  };
  add('name', [before.name], [after.name]);
  add('events', asSet(before.events), asSet(after.events));
  add('workflow permissions', permissionScopes(before.workflowPermissions ?? { '*': 'unknown' }), permissionScopes(after.workflowPermissions ?? { '*': 'unknown' }));
  add('jobs', asSet(before.jobs.map(job => job.id)), asSet(after.jobs.map(job => job.id)));
  const previousJobs = new Map(before.jobs.map(job => [job.id, job]));
  for (const current of [...after.jobs].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)) {
    const previous = previousJobs.get(current.id);
    if (!previous) continue;
    add('name', [previous.name], [current.name], current);
    add('permissions', permissionValues(previous), permissionValues(current), current);
    add('needs', asSet(previous.needs), asSet(current.needs), current);
    add('secrets', asSet(previous.secrets), asSet(current.secrets), current);
    add('actions', previous.actions, current.actions, current);
    add('runner', [runnerValue(previous.runner)], [runnerValue(current.runner)], current);
    add('condition', previous.condition === undefined ? [] : [previous.condition], current.condition === undefined ? [] : [current.condition], current);
    add('steps', [String(previous.steps)], [String(current.steps)], current);
    add('reusable', [String(previous.reusable)], [String(current.reusable)], current);
    add('workflow reference', previous.workflowRef === undefined ? [] : [previous.workflowRef], current.workflowRef === undefined ? [] : [current.workflowRef], current);
  }
  result.addedFindings = unmatchedFindings(after.findings, before.findings);
  result.removedFindings = unmatchedFindings(before.findings, after.findings);
  return result;
}

const escapeMarkdown = (value: string): string => value.replace(/[\r\n]+/g, ' ').replace(/[&<>"'`*_\[\]()!#|~\\]/g, character => `&#${character.codePointAt(0)};`);
const values = (items: string[]): string => items.length ? items.map(escapeMarkdown).join('; ') : '(none)';

/** Portable review report; workflow-controlled text cannot introduce Markdown markup. */
export function comparisonMarkdown(result: WorkflowComparison): string {
  const lines = ['# Workflow Lens change review', '',
    'Selected static differences, not a complete YAML diff or security certification. Neither workflow was executed.', ''];
  if (result.before.errors.length || result.after.errors.length) {
    lines.push('Comparison unavailable. Fix the workflow errors before reviewing differences.', '');
    for (const [label, analysis] of [['Before', result.before], ['After', result.after]] as const) {
      if (analysis.errors.length) lines.push(`## ${label} errors`, ...analysis.errors.map(error => `- ${escapeMarkdown(error)}`), '');
    }
  } else {
    lines.push('## Selected field changes', '');
    if (result.changes.length) {
      lines.push('| Scope | Field | Before | After |', '| --- | --- | --- | --- |',
        ...result.changes.map(change => `| ${escapeMarkdown(change.job === undefined ? 'Workflow' : `Job: ${change.job}`)} | ${escapeMarkdown(change.field)} | ${values(change.before)} | ${values(change.after)} |`), '');
    } else lines.push('No listed field differences detected. Other workflow behavior may have changed.', '');
    for (const [title, findings, side] of [
      ['Newly matching review hints', result.addedFindings, 'after'],
      ['No longer matching review hints', result.removedFindings, 'before'],
    ] as const) {
      lines.push(`## ${title}`, '');
      if (!findings.length) lines.push('None.', '');
      else for (const finding of findings) lines.push(
        `- ${escapeMarkdown(finding.severity.toUpperCase())}: ${escapeMarkdown(finding.title)} — ${escapeMarkdown(finding.rule)}${finding.job === undefined ? '' : `; job ${escapeMarkdown(finding.job)}`}; ${side} line ${finding.line}`,
        `  ${escapeMarkdown(finding.detail)}`, `  Review: ${escapeMarkdown(finding.advice)}`, '');
    }
  }
  lines.push('## Limits', '', ...result.warnings.map(warning => `- ${escapeMarkdown(warning)}`), '',
    'Generated locally with [Workflow Lens](https://sreyasts.github.io/workflow-lens/).', '');
  return lines.join('\n');
}
