import { isNode, LineCounter, parseDocument } from 'yaml';

export type Severity = 'high' | 'medium' | 'info';
export interface Finding {
  rule: string; severity: Severity; title: string; detail: string; advice: string;
  line: number; job?: string; step?: number; source: string;
}
export interface Job {
  id: string; name: string; line: number; needs: string[]; runner: string;
  permissions: Record<string, string>; inheritedPermissions: boolean;
  secrets: string[]; actions: string[]; steps: number; condition?: string;
  reusable: boolean;
}
export interface Analysis {
  name: string; events: string[]; jobs: Job[]; findings: Finding[];
  errors: string[]; warnings: string[]; sourceLines: number;
}
type Obj = Record<string, unknown>;
const obj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const text = (x: unknown): string => typeof x === 'string' ? x : '';
const own = (x: Obj, key: string): boolean => Object.hasOwn(x, key);
// GitHub's `$/` self-repository form resolves to the running commit.
const selfRepositoryRef = (value: string): boolean => value.startsWith('$/');
const docs = 'https://docs.github.com/en/actions/reference/security/secure-use';
const list = (x: unknown): string[] => typeof x === 'string' ? [x] : Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [];
function permissions(value: unknown): Record<string, string> {
  if (value === 'read-all') return { '*': 'read' };
  if (value === 'write-all') return { '*': 'write' };
  if (!obj(value)) return { '*': 'unknown' };
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === 'string' ? v : 'unknown']));
}
function strings(value: unknown, found: string[] = [], depth = 0): string[] {
  if (depth > 40) throw new Error('Workflow nesting exceeds the supported depth of 40.');
  if (typeof value === 'string') found.push(value);
  else if (Array.isArray(value)) value.forEach(v => strings(v, found, depth + 1));
  else if (obj(value)) Object.values(value).forEach(v => strings(v, found, depth + 1));
  return found;
}
/** Read separate expression bodies, ignoring literal values and normalizing literal property keys.
 * This is a lexical helper, not an expression evaluator or complete syntax validator.
 */
function expressionCode(source: string): string[] {
  const expressions: string[] = [];
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf('${{', offset);
    if (start < 0) break;
    const parts: string[] = [];
    let i = start + 3;
    let bracket = -1;
    let closed = false;
    while (i < source.length) {
      if (source.startsWith('}}', i)) { offset = i + 2; closed = true; break; }
      const quote = source[i];
      if (quote === "'" || quote === '"') {
        let end = i + 1; let literal = ''; let terminated = false;
        while (end < source.length) {
          if (source[end] === quote) {
            if (source[end + 1] === quote) { literal += quote; end += 2; continue; }
            end++; terminated = true; break;
          }
          literal += source[end++];
        }
        if (!terminated) break;
        let before = i - 1; while (before >= 0 && /\s/.test(source[before])) before--;
        let receiver = before - 1; while (receiver >= 0 && /\s/.test(source[receiver])) receiver--;
        let after = end; while (after < source.length && /\s/.test(source[after])) after++;
        if (source[before] === '[' && bracket >= 0 && /[\w\]]/.test(source[receiver] ?? '') && source[after] === ']' && /^[A-Za-z_][\w-]*$/.test(literal)) {
          parts.length = bracket; parts.push('.', literal); i = after + 1;
        } else { parts.push(' '); i = end; }
        continue;
      }
      if (source[i] === '[') bracket = parts.length;
      parts.push(source[i++]);
    }
    if (!closed) break;
    expressions.push(parts.join(''));
  }
  return expressions;
}

function secretNames(value: unknown): string[] {
  const names = strings(value).flatMap(expressionCode).flatMap(code => Array.from(code.matchAll(/\bsecrets\s*\.\s*([A-Za-z_]\w*)/g), m => m[1].toUpperCase()));
  return [...new Set(names)];
}

/** Bounded static hints. Does not execute scripts, resolve external actions, or prove safety. */
export function analyze(source: string): Analysis {
  const result: Analysis = { name: 'Untitled workflow', events: [], jobs: [], findings: [], errors: [], warnings: [], sourceLines: source.split('\n').length };
  if (new TextEncoder().encode(source).length > 256_000) {
    result.errors.push('Workflow exceeds the 256 KB input limit.'); return result;
  }
  if (!source.trim()) { result.errors.push('Paste or open a GitHub Actions YAML workflow to begin.'); return result; }
  try {
    const counter = new LineCounter();
    const doc = parseDocument(source, { version: '1.2', lineCounter: counter, uniqueKeys: true, stringKeys: true });
    if (doc.errors.length) { result.errors = doc.errors.map(e => e.message); return result; }
    if (doc.warnings.length) { result.errors = doc.warnings.map(e => `Unsupported YAML: ${e.message}`); return result; }
    const root: unknown = doc.toJS({ maxAliasCount: 0, mapAsMap: false });
    if (!obj(root)) { result.errors.push('Expected a workflow mapping with on and jobs fields.'); return result; }
    strings(root); // Enforce depth bound before walking nested values.
    if (!own(root, 'on') || !(typeof root.on === 'string' || Array.isArray(root.on) || obj(root.on))) result.errors.push('Expected an on trigger (string, list, or mapping).');
    if (!obj(root.jobs) || !Object.keys(root.jobs).length) { result.errors.push('Expected at least one job in a jobs mapping.'); return result; }
    if (Object.keys(root.jobs).length > 100) { result.errors.push('This reviewer supports up to 100 jobs per workflow.'); return result; }
    const totalSteps = Object.values(root.jobs).reduce<number>((n, j) => n + (obj(j) && Array.isArray(j.steps) ? j.steps.length : 0), 0);
    if (totalSteps > 1000) { result.errors.push('This reviewer supports up to 1,000 steps per workflow.'); return result; }
    result.name = text(root.name) || result.name;
    result.events = obj(root.on) ? Object.keys(root.on) : list(root.on);
    const line = (path: (string | number)[]): number => {
      const node = doc.getIn(path, true);
      return isNode(node) && node.range ? counter.linePos(node.range[0]).line : 1;
    };
    const add = (rule: string, severity: Severity, title: string, detail: string, advice: string, path: (string | number)[], job?: string, step?: number) => {
      result.findings.push({ rule, severity, title, detail, advice, line: line(path), job, step, source: docs });
    };
    const privileged = result.events.some(e => e === 'pull_request_target' || e === 'workflow_run');
    if (privileged) add('privileged-trigger', 'medium', 'Privileged event needs a trust review', `${result.events.filter(e => ['pull_request_target', 'workflow_run'].includes(e)).join(', ')} can run in a privileged context. Conditions and repository settings affect exposure.`, 'Keep untrusted code and artifacts out of privileged execution; review the boundary manually.', ['on']);
    if (!own(root, 'permissions')) add('implicit-permissions', 'info', 'Workflow token defaults are unknown', 'No workflow-level permissions declaration. Repository defaults and job overrides decide actual permissions.', 'Declare a minimal workflow default, then grant required permissions per job.', ['jobs']);
    if (root.permissions === 'write-all') add('workflow-write-all', 'medium', 'Workflow requests write-all', 'Every inheriting job requests broad token access, subject to platform restrictions.', 'Replace write-all with individually required permissions.', ['permissions']);
    for (const [id, raw] of Object.entries(root.jobs)) {
      if (!obj(raw)) { result.errors.push(`Job ${id} must be a mapping.`); continue; }
      const path: (string | number)[] = ['jobs', id];
      const jobPerms = own(raw, 'permissions') ? raw.permissions : root.permissions;
      const perms = permissions(jobPerms);
      const steps = Array.isArray(raw.steps) ? raw.steps : [];
      const reusable = typeof raw.uses === 'string';
      if (!reusable && !Array.isArray(raw.steps)) result.errors.push(`Job ${id} must have steps or call a reusable workflow.`);
      if (!reusable && !own(raw, 'runs-on')) result.errors.push(`Job ${id} is missing runs-on.`);
      const runner = list(raw['runs-on']);
      const runnerLabels = obj(raw['runs-on']) ? list(raw['runs-on'].labels) : runner;
      if (own(raw, 'needs') && !(typeof raw.needs === 'string' ? raw.needs.trim().length > 0 : Array.isArray(raw.needs) && raw.needs.every(value => typeof value === 'string' && value.trim().length > 0))) {
        result.errors.push(`Job ${id} needs must be a non-empty string or a list of non-empty strings.`);
      }
      const effectiveEnv = { ...(obj(root.env) ? root.env : {}), ...(obj(raw.env) ? raw.env : {}) };
      const secrets = [...new Set([...secretNames(raw), ...secretNames(effectiveEnv)])];
      if (raw.secrets === 'inherit') secrets.push('(all available secrets inherited)');
      if (strings([raw, effectiveEnv]).flatMap(expressionCode).some(code => /\bsecrets\s*\[|\b(?:toJSON\s*\(\s*)?secrets\s*(?:\)|$)/i.test(code))) secrets.push('(dynamic secret expression)');
      result.jobs.push({ id, name: text(raw.name) || id, line: line(path), needs: list(raw.needs),
        runner: runner.join(', ') || (obj(raw['runs-on']) ? JSON.stringify(raw['runs-on']) : reusable ? 'Reusable workflow' : 'Unknown'),
        permissions: perms, inheritedPermissions: !own(raw, 'permissions'), secrets,
        actions: steps.filter(obj).map(s => text(s.uses)).filter(Boolean), steps: steps.length,
        condition: text(raw.if) || undefined, reusable });
      if (typeof raw.needs === 'string' && raw.needs.includes('${{')) result.warnings.push(`Dynamic dependencies in ${id} are not resolved.`);
      if (raw.permissions === 'write-all') add('job-write-all', 'medium', 'Job requests write-all', `${id} requests broad write access.`, 'Grant only the scopes this job needs.', [...path, 'permissions'], id);
      if (runnerLabels.some(label => label.toLowerCase() === 'self-hosted') && result.events.some(e => /pull_request/.test(e))) add('self-hosted-pr', 'high', 'PR-triggered job uses a self-hosted runner', 'Contributor code may persist on a runner. Actual exposure depends on repository visibility, approvals, and runner isolation.', 'Use an isolated ephemeral runner and review which contributors can trigger it.', [...path, 'runs-on'], id);
      if (raw.secrets === 'inherit') add('inherit-secrets', 'medium', 'Reusable workflow inherits secrets', 'The called workflow can receive all secrets available to this call.', 'Pass only explicitly required named secrets; inspect the called workflow.', [...path, 'secrets'], id);
      const jobContainer = typeof raw.container === 'string' ? raw.container : obj(raw.container) ? text(raw.container.image) : '';
      if (jobContainer && !jobContainer.startsWith('./') && !/@sha256:[a-f\d]{64}$/i.test(jobContainer) && !/@[a-f\d]{40}$/i.test(jobContainer)) {
        add('unpinned-container', 'info', 'Job container reference is mutable', jobContainer, 'Use a reviewed image digest.', [...path, 'container'], id);
      }
      if (reusable) {
        result.warnings.push(`Called workflow ${raw.uses} is not fetched or expanded.`);
        if (!text(raw.uses).startsWith('./') && !selfRepositoryRef(text(raw.uses)) && !/@[a-f\d]{40}$/i.test(text(raw.uses))) add('unpinned-workflow', 'medium', 'Reusable workflow uses a mutable reference', text(raw.uses), 'Use a reviewed full commit SHA or an appropriate verified dependency lockfile.', [...path, 'uses'], id);
      }
      if (Object.entries(perms).some(([k, v]) => v === 'write' && k !== 'id-token') && steps.length) add('write-token', 'info', 'Job requests a write-capable token', 'All steps in this job share the requested token scope. Event restrictions may reduce effective access.', 'Keep write access isolated to the job that needs it; review each action in that job.', own(raw, 'permissions') ? [...path, 'permissions'] : ['permissions'], id);
      steps.forEach((step, index) => {
        if (!obj(step)) { result.errors.push(`Step ${index + 1} in ${id} must be a mapping.`); return; }
        const stepPath = [...path, 'steps', index];
        const uses = text(step.uses); const run = text(step.run); const withObj = obj(step.with) ? step.with : {};
        if (uses && !uses.startsWith('./') && !selfRepositoryRef(uses) && !uses.startsWith('docker://') && !/@[a-f\d]{40}$/i.test(uses)) add('unpinned-action', 'info', 'Action uses a mutable reference', uses, 'Review the action and pin a full commit SHA, or use an appropriate verified dependency lockfile.', [...stepPath, 'uses'], id, index);
        if (uses.startsWith('docker://') && !/@sha256:[a-f\d]{64}$/i.test(uses)) add('unpinned-container', 'info', 'Container reference is mutable', uses, 'Use a reviewed image digest.', [...stepPath, 'uses'], id, index);
        const untrustedContext = expressionCode(run).some(code => /\b(?:github\.(?:event\.(?:pull_request\.(?:title|body|head\.(?:ref|label))|workflow_run\.(?:head_branch|display_title|head_commit\.message)|issue\.(?:title|body)|(?:review_)?comment\.body|discussion\.(?:title|body)|review\.body|head_commit\.(?:message|author\.(?:name|email)))|head_ref|ref_name|ref)|(?:github\.event\.)?inputs\.[\w.-]+)\b/.test(code));
        if (untrustedContext) add('script-injection', 'high', 'Untrusted context is interpolated into a script', 'PR, issue, branch, or comment text is inserted into the generated shell script. This is a review heuristic; expression parsing is not complete.', 'Pass the value through an environment variable and quote it using your shell conventions. Avoid eval.', [...stepPath, 'run'], id, index);
        const checkout = /^actions\/checkout@/i.test(uses);
        const untrustedRef = strings(withObj).some(s => /github\.event\.(pull_request\.head|workflow_run\.head)|refs\/pull\//.test(s));
        if (privileged && checkout && untrustedRef) add('privileged-checkout', 'high', 'Privileged workflow checks out a PR or run head', 'Untrusted code is placed in a privileged job workspace; later execution can expose credentials or caches. Checkout versions may add protections.', 'Avoid checking out untrusted heads in this context. Separate unprivileged tests from privileged operations.', [...stepPath, 'with'], id, index);
        if (checkout && withObj['persist-credentials'] !== false) add('persist-credentials', 'info', 'Checkout keeps credentials available', 'Checkout is not explicitly configured with persist-credentials: false. Other steps may be able to use its credentials.', 'Set persist-credentials: false when later Git operations do not need authentication.', stepPath, id, index);
        if (/\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo\b[^\n|]*?\s+)?(?:bash|sh|zsh|dash|python\d?|perl|ruby)\b/i.test(run)) add('remote-script', 'medium', 'Downloaded content is piped to a shell', 'Remote content can execute immediately without a separate integrity check.', 'Download a fixed version, verify its integrity, and inspect before execution.', [...stepPath, 'run'], id, index);
      });
    }
    const ids = new Set(result.jobs.map(j => j.id));
    for (const job of result.jobs) for (const need of job.needs) if (!ids.has(need) && !need.includes('${{')) result.errors.push(`Job ${job.id} needs unknown job ${need}.`);
    const active = new Set<string>(); const done = new Set<string>();
    const visit = (id: string): boolean => {
      if (active.has(id)) return true;
      if (done.has(id)) return false;
      active.add(id);
      if (result.jobs.find(j => j.id === id)?.needs.some(n => ids.has(n) && visit(n))) return true;
      active.delete(id); done.add(id); return false;
    };
    if (result.jobs.some(j => visit(j.id))) result.errors.push('Job dependencies contain a cycle.');
    result.warnings.push('Requested permissions are shown. Event restrictions, organization policies, environments, and external action behavior are not resolved.');
    result.findings.sort((a, b) => ({ high: 0, medium: 1, info: 2 }[a.severity] - { high: 0, medium: 1, info: 2 }[b.severity]) || a.line - b.line);
  } catch (error) { result.errors.push(error instanceof Error ? error.message : 'Unable to parse workflow.'); }
  return result;
}

// Encode Markdown syntax triggers and HTML characters so workflow-controlled text
// cannot create Markdown links, images, HTML, headings, or code fences in a report pasted into a PR.
const reportText = (value: string): string => value.replace(/[\r\n]+/g, ' ').replace(/[&<>"'`*_\[\]()!#|~\\]/g, c => `&#${c.codePointAt(0)};`);

/** GitHub-compatible Mermaid with generated IDs and inert quoted labels. */
export function mermaid(result: Analysis): string {
  if (result.errors.length) throw new Error('Fix workflow errors before exporting a diagram.');
  const ids = new Map(result.jobs.map((j, i) => [j.id, `job${i}`]));
  const label = (value: string) => value.replace(/[\r\n]+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, c => `#${c.codePointAt(0)};`);
  return ['flowchart LR', '  %% Static needs dependencies; conditions are not evaluated.',
    ...result.jobs.map(j => `  ${ids.get(j.id)}["${label(j.name === j.id ? j.id : `${j.name} (${j.id})`)}"]`),
    ...result.jobs.flatMap(j => j.needs.filter(n => ids.has(n)).map(n => `  ${ids.get(n)} --> ${ids.get(j.id)}`)),
    ''].join('\n');
}

export function markdown(result: Analysis): string {
  return [`# Workflow Lens: ${reportText(result.name)}`, '', 'Static review hints, not a security certification. No workflow was executed.', '',
    `Triggers: ${reportText(result.events.join(', ') || 'none')} | Jobs: ${result.jobs.length}`, '',
    ...result.errors.map(e => `ERROR: ${reportText(e)}`),
    ...(!result.errors.length ? ['## Job dependencies', '', '```mermaid', mermaid(result).trimEnd(), '```', '', 'Arrows show needs dependencies. Conditions are not evaluated.', ''] : []),
    ...result.jobs.flatMap(j => [`## Job: ${reportText(j.id)}`, `Runner: ${reportText(j.runner)}`, `Needs: ${reportText(j.needs.join(', ') || 'none')}`, `Requested permissions: ${reportText(JSON.stringify(j.permissions))}`, `Secret references: ${reportText(j.secrets.join(', ') || 'none detected')}`, '']),
    ...result.findings.flatMap(f => [`## ${f.severity.toUpperCase()}: ${reportText(f.title)}`, `Rule: ${f.rule} | Line: ${f.line}${f.job ? ` | Job: ${reportText(f.job)}` : ''}`, reportText(f.detail), `Review: ${reportText(f.advice)}`, `Reference: ${f.source}`, '']),
    '## Limits', ...result.warnings.map(reportText), '',
    'Generated locally with [Workflow Lens](https://sreyasts.github.io/workflow-lens/).', ''].join('\n');
}
