import './style.css';
import { analyze, markdown, mermaid } from './analyzer.ts';
import type { Analysis, Finding, Severity } from './analyzer.ts';
import { examples } from './examples.ts';

const escape = (s: unknown): string => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <header class="topbar"><a class="brand" href="./" aria-label="Workflow Lens home"><span class="logo" aria-hidden="true">⌘</span>workflow<span class="brand-light">lens</span><span class="version">v0.1</span></a><nav aria-label="Main"><span class="local"><i></i> Runs on your device</span><a href="https://github.com/sreyasts/workflow-lens" target="_blank" rel="noopener noreferrer">Source code ↗</a></nav></header>
  <main><section class="intro"><div><p class="eyebrow">GITHUB ACTIONS, MADE VISIBLE</p><h1>See what your<br><em>workflow can do.</em></h1><p class="subtitle">Review a GitHub Actions workflow before you merge.<br>Map dependencies and access. Copy the report into your PR.</p></div><aside class="intro-note"><span class="note-symbol" aria-hidden="true">↳</span><p>Your YAML stays here.</p><span>No account. No uploads. No AI calls.<br>Just a workflow and a clearer picture.</span></aside></section>
  <section class="workspace" aria-label="Workflow inspector">
    <div class="workspace-toolbar"><div class="workspace-label"><span class="dot"></span> WORKSPACE <span id="filename">demo.yml</span></div><div class="tools"><label class="sr-only" for="example">Example workflow</label><select id="example"><option value="risky">Example: PR trust boundary</option><option value="minimal">Example: Minimal CI</option><option value="reusable">Example: Reusable release</option></select><button id="open">Open .yml <span aria-hidden="true">↥</span></button><input type="file" id="file" accept=".yml,.yaml,text/yaml,text/plain" hidden><button id="clear" class="subtle">Clear</button></div></div>
    <div class="panels"><section class="editor-panel" aria-labelledby="editor-heading"><div class="panel-heading"><h2 id="editor-heading"><span class="number">01</span> Workflow source</h2><span id="line-count"></span></div><div class="editor-wrap"><div id="line-numbers" aria-hidden="true"></div><label class="sr-only" for="editor">Workflow YAML source</label><textarea id="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="editor-help"></textarea></div><div class="editor-footer" id="editor-help">YAML <span>Paste or drop YAML · Tab moves focus</span><span id="parse-status">Ready</span></div></section>
    <section class="output-panel" aria-labelledby="output-heading"><div class="panel-heading"><h2 id="output-heading"><span class="number">02</span> The bigger picture</h2><button id="export-md" class="subtle">Export report ↓</button></div><div class="export-tools" aria-label="Share analysis"><button id="copy-report">Copy PR report</button><button id="export-mermaid">Mermaid diagram ↓</button><span id="export-status" role="status">Reports include workflow metadata. Review before sharing.</span></div><div id="results"></div></section></div>
  </section>
  <section class="below"><div><span class="small-label">BUILT FOR THE REVIEW, BEFORE THE RUN.</span><h2>Less YAML archaeology.<br>More informed decisions.</h2></div><div class="limitations"><p><strong>A map, not a security verdict.</strong> This is an early static reviewer. It cannot resolve organization policies, evaluate conditions, inspect external actions, or expand reusable workflows. Requested permissions may differ from actual access.</p><p>For deeper checks, pair it with <a href="https://docs.zizmor.sh/" target="_blank" rel="noopener noreferrer">zizmor</a> and <a href="https://github.com/rhysd/actionlint" target="_blank" rel="noopener noreferrer">actionlint</a>. <a href="https://docs.github.com/en/actions/reference/security/secure-use" target="_blank" rel="noopener noreferrer">Read GitHub’s security guidance ↗</a></p></div></section>
  </main><footer><span>Workflow Lens · Open source under MIT</span><span>Built for maintainers. No usage counters or tracking.</span><a href="https://github.com/sreyasts/workflow-lens/issues/new?template=feedback.md" target="_blank" rel="noopener noreferrer">Help shape the next release ↗</a></footer><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;

const editor = document.querySelector<HTMLTextAreaElement>('#editor')!;
const results = document.querySelector<HTMLDivElement>('#results')!;
const fileInput = document.querySelector<HTMLInputElement>('#file')!;
const select = document.querySelector<HTMLSelectElement>('#example')!;
let analysis: Analysis;
let selectedJob: string | undefined;
let severity: Severity | 'all' = 'all';
let tab: 'map' | 'findings' = 'map';
let timer: ReturnType<typeof setTimeout>;
let exampleMode = true;
let message = '';
let sourceRevision = 0;

function announce(s: string) { document.querySelector('#announcement')!.textContent = s; }
function setSource(source: string, name: string, demo: boolean) {
  sourceRevision++; clearTimeout(timer); editor.value = source; selectedJob = undefined; severity = 'all'; exampleMode = demo; message = '';
  document.querySelector('#filename')!.textContent = name; update();
}
function update() {
  document.querySelector('#export-status')!.textContent = 'Reports include workflow metadata. Review before sharing.';
  analysis = analyze(editor.value);
  if (!analysis.jobs.some(j => j.id === selectedJob)) selectedJob = undefined;
  const count = editor.value.split('\n').length;
  document.querySelector('#line-numbers')!.textContent = Array.from({ length: count }, (_, i) => i + 1).join('\n');
  document.querySelector('#line-count')!.textContent = `${count} lines`;
  document.querySelector('#parse-status')!.textContent = analysis.errors.length ? 'Needs attention' : 'Parsed locally';
  render(); announce(analysis.errors.length ? analysis.errors[0] : `${analysis.jobs.length} jobs. ${analysis.findings.filter(f => f.severity === 'high').length} high priority hints.`);
}
function permissionLabel(p: Record<string, string>): string {
  const entries = Object.entries(p);
  return entries.length ? entries.map(([k, v]) => `${k === '*' ? 'all scopes' : k}: ${v}`).join(' · ') : 'No token permissions requested';
}
function rankJobs(): Map<string, number> {
  const ranks = new Map(analysis.jobs.map(j => [j.id, 0]));
  if (analysis.errors.length) return ranks;
  for (let i = 0; i < analysis.jobs.length; i++) for (const j of analysis.jobs) ranks.set(j.id, Math.max(0, ...j.needs.map(n => (ranks.get(n) ?? -1) + 1)));
  return ranks;
}
function findingsList(items: Finding[]): string {
  if (!items.length) return '<div class="empty-small"><span aria-hidden="true">✓</span><h3>No matching review hints</h3><p>This does not establish that a workflow is safe. Try another filter or inspect the source.</p></div>';
  return items.map(f => `<article class="finding ${f.severity}"><div class="finding-top"><span class="severity">${f.severity === 'info' ? 'NOTE' : f.severity.toUpperCase()}</span><button class="line-link" data-line="${f.line}">Line ${f.line} ↗</button></div><h3>${escape(f.title)}</h3><p>${escape(f.detail)}</p><details><summary>How to review this</summary><p>${escape(f.advice)}</p><a href="${f.source}" target="_blank" rel="noopener noreferrer">GitHub guidance ↗</a><code>${escape(f.rule)}</code></details></article>`).join('');
}
function render() {
  document.querySelectorAll<HTMLButtonElement>('#export-md, #copy-report, #export-mermaid').forEach(button => { button.disabled = !!analysis.errors.length; });
  if (!editor.value.trim()) { results.innerHTML = '<div class="empty"><span aria-hidden="true">⌘</span><h3>A workflow, in focus.</h3><p>Paste YAML on the left, open a file, or choose an example to see jobs and review hints.</p></div>'; return; }
  if (analysis.errors.length) { results.innerHTML = `<div class="error-box" role="alert"><h3>Let’s fix the input first.</h3>${analysis.errors.map(e => `<pre>${escape(e)}</pre>`).join('')}<p>Only single-document YAML workflows are supported. YAML aliases and custom tags are intentionally unsupported.</p></div>`; return; }
  const high = analysis.findings.filter(f => f.severity === 'high').length;
  const medium = analysis.findings.filter(f => f.severity === 'medium').length;
  const infos = analysis.findings.filter(f => f.severity === 'info').length;
  const chosen = analysis.jobs.find(j => j.id === selectedJob);
  const filtered = analysis.findings.filter(f => (!selectedJob || !f.job || f.job === selectedJob) && (severity === 'all' || f.severity === severity));
  const ranks = rankJobs();
  const levels = [...new Set(ranks.values())].sort((a, b) => a - b);
  results.innerHTML = `${exampleMode ? '<div class="demo-notice">ILLUSTRATIVE EXAMPLE <span>Replace with your own workflow to review it.</span></div>' : ''}${message ? `<div class="demo-notice">${escape(message)}</div>` : ''}
    <div class="summary"><div><span class="small-label">WORKFLOW OVERVIEW</span><h3>${escape(analysis.name)}</h3><div class="event-list">${analysis.events.map(e => `<span>${escape(e)}</span>`).join('')}</div></div><div class="job-total"><strong>${analysis.jobs.length}</strong><span>jobs</span></div></div>
    <div class="stats"><button data-severity="high" class="stat ${severity === 'high' ? 'active' : ''}"><span class="stat-dot high-dot"></span><strong>${high}</strong> High priority</button><button data-severity="medium" class="stat ${severity === 'medium' ? 'active' : ''}"><span class="stat-dot medium-dot"></span><strong>${medium}</strong> Review</button><button data-severity="info" class="stat ${severity === 'info' ? 'active' : ''}"><span class="stat-dot info-dot"></span><strong>${infos}</strong> Notes</button></div>
    <div class="tabs" role="tablist" aria-label="Analysis view"><button role="tab" id="map-tab" aria-controls="analysis-view" aria-selected="${tab === 'map'}" data-tab="map">Job map</button><button role="tab" id="findings-tab" aria-controls="analysis-view" aria-selected="${tab === 'findings'}" data-tab="findings">Review hints <span>${analysis.findings.length}</span></button><button id="export-json" class="json-export">JSON ↓</button></div>
    <div id="analysis-view" role="tabpanel" aria-labelledby="${tab}-tab">${tab === 'map' ? `<div class="map-caption"><span>REQUESTED ACCESS & DEPENDENCIES</span><button id="all-jobs" class="subtle">${selectedJob ? 'Show all jobs' : 'Select a job for details'}</button></div><div class="graph-scroll"><div class="graph"><svg aria-hidden="true" class="edges"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#a6b3ab"/></marker></defs><g></g></svg>${levels.map(level => `<div class="graph-level">${analysis.jobs.filter(j => ranks.get(j.id) === level).map(j => {
      const hits = analysis.findings.filter(f => f.job === j.id && f.severity === 'high').length;
      return `<button class="job-card ${selectedJob === j.id ? 'selected' : ''}" data-job="${escape(j.id)}" aria-pressed="${selectedJob === j.id}"><div class="job-card-top"><span class="job-icon" aria-hidden="true">${j.reusable ? '↗' : '◇'}</span><span>${hits ? `<span class="risk-pill">${hits} high</span>` : '<span class="muted">JOB</span>'}</span></div><strong>${escape(j.name)}</strong><code>${escape(j.id)}</code><p>${escape(j.runner)}</p><div class="access"><span>${Object.values(j.permissions).includes('write') ? '↗ Write requested' : Object.values(j.permissions).includes('unknown') ? '? Access unknown' : '↓ Limited access'}</span><span>${j.secrets.length} secret ref${j.secrets.length === 1 ? '' : 's'}</span></div></button>`;
    }).join('')}</div>`).join('')}</div></div><p class="map-legend"><span>→</span> needs dependency <span>◇</span> Single-file view · conditions are not evaluated</p>${chosen ? `<div class="job-details"><div class="detail-heading"><h3>${escape(chosen.name)}</h3><button data-line="${chosen.line}" class="line-link">Line ${chosen.line} ↗</button></div><dl><dt>Requested token</dt><dd>${escape(permissionLabel(chosen.permissions))}</dd><dt>Permission source</dt><dd>${chosen.inheritedPermissions ? 'Inherited from workflow / repository defaults' : 'Explicit job override'}</dd><dt>Secret references</dt><dd>${escape(chosen.secrets.join(', ') || 'None detected (external actions may access credentials)')}</dd><dt>Actions</dt><dd>${escape(chosen.actions.join(', ') || (chosen.reusable ? 'External workflow — not expanded' : 'No uses steps'))}</dd>${chosen.condition ? `<dt>Condition (not evaluated)</dt><dd>${escape(chosen.condition)}</dd>` : ''}</dl></div>` : ''}<div class="section-label">${selectedJob ? 'THIS JOB & WORKFLOW' : 'FIRST THINGS TO REVIEW'} <button data-tab="findings" class="subtle">View all hints →</button></div>${findingsList(filtered.slice(0, 3))}` : `<div class="filter-row"><span>${filtered.length} hint${filtered.length === 1 ? '' : 's'}${chosen ? ` · ${escape(chosen.id)} + workflow` : ''}</span><button id="reset-filters" class="subtle">Show all</button></div>${findingsList(filtered)}`}</div>
    <details class="scope"><summary>What this review can’t tell you</summary>${analysis.warnings.map(w => `<p>${escape(w)}</p>`).join('')}<p>Heuristic checks can miss risks or flag intentional patterns. No external actions or workflow code are executed.</p></details>`;
  results.querySelectorAll<HTMLButtonElement>('[data-job]').forEach(el => el.onclick = () => { selectedJob = selectedJob === el.dataset.job ? undefined : el.dataset.job; render(); });
  results.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(el => el.onclick = () => { tab = el.dataset.tab as typeof tab; render(); });
  results.querySelectorAll<HTMLButtonElement>('[data-severity]').forEach(el => el.onclick = () => { severity = severity === el.dataset.severity ? 'all' : el.dataset.severity as Severity; tab = 'findings'; render(); });
  results.querySelectorAll<HTMLButtonElement>('[data-line]').forEach(el => el.onclick = () => focusLine(Number(el.dataset.line)));
  const all = results.querySelector<HTMLButtonElement>('#all-jobs'); if (all) all.onclick = () => { selectedJob = undefined; render(); };
  const reset = results.querySelector<HTMLButtonElement>('#reset-filters'); if (reset) reset.onclick = () => { selectedJob = undefined; severity = 'all'; render(); };
  results.querySelector<HTMLButtonElement>('#export-json')!.onclick = () => { clearTimeout(timer); update(); if (!analysis.errors.length) download(JSON.stringify(analysis, null, 2), 'workflow-review.json', 'application/json'); };
  requestAnimationFrame(drawEdges);
}
function drawEdges() {
  const graph = results.querySelector<HTMLDivElement>('.graph');
  const svg = results.querySelector<SVGSVGElement>('.edges'); if (!graph || !svg) return;
  const box = graph.getBoundingClientRect();
  svg.setAttribute('width', String(graph.scrollWidth)); svg.setAttribute('height', String(graph.scrollHeight));
  const paths: string[] = [];
  const cards = [...graph.querySelectorAll<HTMLElement>('[data-job]')];
  for (const job of analysis.jobs) for (const need of job.needs) {
    const from = cards.find(el => el.dataset.job === need)?.getBoundingClientRect();
    const to = cards.find(el => el.dataset.job === job.id)?.getBoundingClientRect();
    if (!from || !to) continue;
    const x1 = from.right - box.left; const y1 = from.top + from.height / 2 - box.top;
    const x2 = to.left - box.left - 3; const y2 = to.top + to.height / 2 - box.top;
    paths.push(`<path d="M${x1},${y1} C${x1 + 22},${y1} ${x2 - 22},${y2} ${x2},${y2}" fill="none" stroke="#a6b3ab" stroke-width="1.5" marker-end="url(#arrow)"/>`);
  }
  svg.querySelector('g')!.innerHTML = paths.join('');
}
function focusLine(line: number) {
  const lines = editor.value.split('\n'); const start = lines.slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
  editor.focus(); editor.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0)); editor.scrollTop = Math.max(0, (line - 4) * 22);
  document.querySelector('#line-numbers')!.scrollTop = editor.scrollTop;
  if (innerWidth < 900) editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  announce(`Source line ${line} selected`);
}
function download(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); announce(`Downloaded ${name}`);
}
async function openFile(file?: File) {
  if (!file) return;
  if (!/\.ya?ml$/i.test(file.name) || file.size > 256_000) { announce('Choose a .yml or .yaml file under 256 KB.'); message = 'Choose a .yml or .yaml file under 256 KB.'; render(); return; }
  try { setSource(await file.text(), file.name, false); } catch { message = 'Could not read this file. Try opening it again.'; render(); }
}
editor.addEventListener('input', () => { sourceRevision++; exampleMode = false; clearTimeout(timer); document.querySelector('#parse-status')!.textContent = 'Updating…'; document.querySelectorAll<HTMLButtonElement>('#export-md, #copy-report, #export-mermaid').forEach(button => { button.disabled = true; }); timer = setTimeout(update, 250); });
editor.addEventListener('scroll', () => { document.querySelector('#line-numbers')!.scrollTop = editor.scrollTop; });
select.onchange = () => setSource(examples[select.value as keyof typeof examples], `${select.value}.yml`, true);
document.querySelector<HTMLButtonElement>('#open')!.onclick = () => fileInput.click();
fileInput.onchange = () => { void openFile(fileInput.files?.[0]); fileInput.value = ''; };
document.querySelector<HTMLButtonElement>('#clear')!.onclick = () => { setSource('', 'untitled.yml', false); editor.focus(); };
document.querySelector<HTMLButtonElement>('#export-md')!.onclick = () => { clearTimeout(timer); update(); if (!analysis.errors.length) download(markdown(analysis), 'workflow-review.md', 'text/markdown'); };
document.querySelector<HTMLButtonElement>('#copy-report')!.onclick = async () => {
  clearTimeout(timer); update();
  if (analysis.errors.length) return;
  const revision = sourceRevision;
  try {
    await navigator.clipboard.writeText(markdown(analysis));
    if (revision === sourceRevision) document.querySelector('#export-status')!.textContent = 'Copied Markdown with a job diagram. Paste into your PR.';
  } catch {
    if (revision === sourceRevision) document.querySelector('#export-status')!.textContent = 'Clipboard unavailable. Use Export report to save the Markdown file.';
  }
};
document.querySelector<HTMLButtonElement>('#export-mermaid')!.onclick = () => {
  clearTimeout(timer); update();
  if (!analysis.errors.length) download(mermaid(analysis), 'workflow-diagram.mmd', 'text/plain');
};
const workspace = document.querySelector<HTMLElement>('.workspace')!;
workspace.addEventListener('dragover', e => { e.preventDefault(); workspace.classList.add('dragging'); });
workspace.addEventListener('dragleave', e => { if (!workspace.contains(e.relatedTarget as Node)) workspace.classList.remove('dragging'); });
workspace.addEventListener('drop', e => { e.preventDefault(); workspace.classList.remove('dragging'); void openFile(e.dataTransfer?.files[0]); });
addEventListener('resize', drawEdges);
setSource(examples.risky, 'community-pr.yml', true);
