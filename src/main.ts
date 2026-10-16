import './style.css';
import { analyze, markdown, mermaid } from './analyzer.ts';
import type { Analysis, Finding, Severity } from './analyzer.ts';
import { examples } from './examples.ts';

const escape = (s: unknown): string => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const ICON_LOGO = `<svg class="brand-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5"></rect><rect x="15" y="5" width="6" height="6" rx="1.5"></rect><rect x="9" y="15" width="6" height="6" rx="1.5"></rect><path d="M9 6h3a3 3 0 0 1 3 3v-1"></path><path d="M6 9v3a3 3 0 0 0 3 3"></path></svg>`;

const ICON_GITHUB = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`;

const ICON_FILE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

const ICON_UPLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;

const ICON_CLEAR = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>`;

const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

const ICON_DOWNLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

const ICON_DIAGRAM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="6" y1="9" x2="6" y2="15"></line><path d="M20 12a3 3 0 0 0-3-3H9"></path><circle cx="20" cy="12" r="2"></circle></svg>`;

const ICON_CODE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;

const ICON_INSPECT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

const ICON_EXTERNAL = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

const ICON_JOB = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="m9 12 2 2 4-4"></path></svg>`;

const ICON_REUSABLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>`;

const ICON_ALERT_HIGH = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

const ICON_ALERT_MEDIUM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

const ICON_ALERT_INFO = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

const ICON_CHECK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>`;

const ICON_SHIELD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;

const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `
  <header class="topbar">
    <div class="brand-group">
      <a class="brand" href="./" aria-label="Workflow Lens home">
        <span class="logo">${ICON_LOGO}</span>
        <span class="brand-text">Workflow<span class="brand-accent">Lens</span></span>
        <span class="version">v0.1.0</span>
      </a>
      <span class="brand-divider">/</span>
      <span class="brand-tagline">GitHub Actions Inspector</span>
    </div>
    <nav aria-label="Main navigation">
      <span class="local" title="Client-side static AST parsing only. No network calls or telemetry.">
        <span class="dot"></span> Client-side only · Zero network calls
      </span>
      <a href="https://github.com/sreyasts/workflow-lens" class="nav-link" target="_blank" rel="noopener noreferrer">
        ${ICON_GITHUB} <span>Source code</span> <span class="external-arr">↗</span>
      </a>
    </nav>
  </header>
  <main>
    <section class="intro">
      <div class="intro-main">
        <div class="intro-badge">
          <span class="intro-badge-dot"></span>
          <span>STATIC PIPELINE REVIEWER</span>
        </div>
        <h1>Review GitHub Actions Before Merging</h1>
        <p class="subtitle">Inspect token permissions, secret exposure, runner trust boundaries, and job dependency graphs locally in your browser.</p>
      </div>
      <div class="intro-features">
        <div class="feature-item">
          <span class="feature-title">Local Engine</span>
          <span class="feature-desc">Runs 100% on device · No uploads</span>
        </div>
        <div class="feature-item">
          <span class="feature-title">PR-Ready Artifacts</span>
          <span class="feature-desc">Export Markdown reports & Mermaid maps</span>
        </div>
      </div>
    </section>

    <section class="workspace" aria-label="Workflow inspector">
      <div class="workspace-toolbar">
        <div class="workspace-label">
          ${ICON_FILE}
          <span class="toolbar-muted">FILE:</span>
          <span id="filename">community-pr.yml</span>
        </div>
        <div class="tools">
          <label class="sr-only" for="example">Load example workflow</label>
          <div class="select-wrap">
            <select id="example">
              <option value="risky">Preset: PR Trust Boundary (High Risk)</option>
              <option value="minimal">Preset: Minimal CI Pipeline</option>
              <option value="reusable">Preset: Reusable Release Workflow</option>
            </select>
          </div>
          <button id="open" class="btn btn-secondary">${ICON_UPLOAD} Open .yml</button>
          <input type="file" id="file" accept=".yml,.yaml,text/yaml,text/plain" hidden>
          <button id="clear" class="btn btn-ghost subtle">${ICON_CLEAR} Clear</button>
        </div>
      </div>
      <div class="panels">
        <section class="editor-panel" aria-labelledby="editor-heading">
          <div class="panel-heading">
            <h2 id="editor-heading">${ICON_CODE} Workflow Source</h2>
            <span id="line-count" class="badge-count"></span>
          </div>
          <div class="editor-wrap">
            <div id="line-numbers" aria-hidden="true"></div>
            <label class="sr-only" for="editor">Workflow YAML source</label>
            <textarea id="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-describedby="editor-help"></textarea>
          </div>
          <div class="editor-footer" id="editor-help">
            <span>Paste or drop YAML · Tab indents</span>
            <span id="parse-status" class="status-pill">Ready</span>
          </div>
        </section>

        <section class="output-panel" aria-labelledby="output-heading">
          <div class="panel-heading">
            <h2 id="output-heading">${ICON_INSPECT} Visual Review & Graph</h2>
            <button id="export-md" class="btn btn-ghost subtle">${ICON_DOWNLOAD} Export .md</button>
          </div>
          <div class="export-tools" aria-label="Share analysis">
            <button id="copy-report" class="btn btn-primary">${ICON_COPY} Copy PR Report</button>
            <button id="export-mermaid" class="btn btn-secondary">${ICON_DIAGRAM} Mermaid Diagram</button>
            <span id="export-status" role="status">Reports include workflow metadata. Review before sharing.</span>
          </div>
          <div id="results"></div>
        </section>
      </div>
    </section>

    <section class="below">
      <div class="below-intro">
        <span class="small-label">SPECIFICATIONS & VERIFICATION</span>
        <h2>Built for code review, before the pipeline runs.</h2>
        <p>Catch privilege escalation, script injection, and excessive permissions in pull requests before runners execute untrusted code.</p>
      </div>
      <div class="limitations">
        <p><strong>A structural reviewer, not an execution sandbox.</strong> Workflow Lens performs deterministic AST analysis of single YAML files. It cannot evaluate dynamic <code>if</code> expressions, resolve organization permission policies, inspect private external actions, or expand matrix runners at runtime.</p>
        <p>For automated CI policy enforcement, pair with <a href="https://docs.zizmor.sh/" target="_blank" rel="noopener noreferrer">zizmor</a> and <a href="https://github.com/rhysd/actionlint" target="_blank" rel="noopener noreferrer">actionlint</a>. Refer to <a href="https://docs.github.com/en/actions/reference/security/secure-use" target="_blank" rel="noopener noreferrer">GitHub’s secure workflow guidelines ↗</a></p>
      </div>
    </section>
  </main>
  <footer>
    <span>Workflow Lens · Open source under MIT License</span>
    <span>Runs entirely in browser · Zero tracking or analytics</span>
    <a href="https://github.com/sreyasts/workflow-lens/issues/new?template=feedback.md" target="_blank" rel="noopener noreferrer">Report an issue / feedback ↗</a>
  </footer>
  <div id="announcement" class="sr-only" role="status" aria-live="polite"></div>
`;

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
  const parseStatus = document.querySelector('#parse-status')!;
  if (analysis.errors.length) {
    parseStatus.textContent = 'Syntax error';
    parseStatus.className = 'status-pill status-error';
  } else {
    parseStatus.textContent = 'Parsed locally';
    parseStatus.className = 'status-pill status-ready';
  }
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
  if (!items.length) {
    return `<div class="empty-small">${ICON_CHECK}<h3>No matching review hints</h3><p>This filter found no hotspots. This does not certify complete safety; inspect external actions and runner permissions directly.</p></div>`;
  }
  return items.map(f => `
    <article class="finding ${f.severity}">
      <div class="finding-top">
        <span class="severity ${f.severity}">
          ${f.severity === 'high' ? ICON_ALERT_HIGH : f.severity === 'medium' ? ICON_ALERT_MEDIUM : ICON_ALERT_INFO}
          ${f.severity === 'info' ? 'NOTE' : f.severity.toUpperCase()}
        </span>
        <button class="line-link" data-line="${f.line}">Line ${f.line} ${ICON_EXTERNAL}</button>
      </div>
      <h3>${escape(f.title)}</h3>
      <p>${escape(f.detail)}</p>
      <details>
        <summary>Review advice & remediation</summary>
        <div class="advice-content">
          <p>${escape(f.advice)}</p>
          <div class="advice-meta">
            <a href="${f.source}" target="_blank" rel="noopener noreferrer">GitHub guidance ${ICON_EXTERNAL}</a>
            <code class="rule-tag">${escape(f.rule)}</code>
          </div>
        </div>
      </details>
    </article>
  `).join('');
}

function render() {
  document.querySelectorAll<HTMLButtonElement>('#export-md, #copy-report, #export-mermaid').forEach(button => { button.disabled = !analysis.jobs.length || !!analysis.errors.length; });
  if (!editor.value.trim()) {
    results.innerHTML = `<div class="empty">${ICON_LOGO}<h3>No workflow loaded</h3><p>Paste YAML on the left, open a local file, or choose a preset example to visualize jobs and review hints.</p></div>`;
    return;
  }
  if (analysis.errors.length) {
    results.innerHTML = `
      <div class="error-box" role="alert">
        <div class="error-box-header">${ICON_ALERT_HIGH} <h3>YAML Input Error</h3></div>
        ${analysis.errors.map(e => `<pre>${escape(e)}</pre>`).join('')}
        <p>Only single-document YAML workflows are supported. YAML aliases and custom tags are intentionally unsupported.</p>
      </div>
    `;
    return;
  }
  const high = analysis.findings.filter(f => f.severity === 'high').length;
  const medium = analysis.findings.filter(f => f.severity === 'medium').length;
  const infos = analysis.findings.filter(f => f.severity === 'info').length;
  const chosen = analysis.jobs.find(j => j.id === selectedJob);
  const filtered = analysis.findings.filter(f => (!selectedJob || !f.job || f.job === selectedJob) && (severity === 'all' || f.severity === severity));
  const ranks = rankJobs();
  const levels = [...new Set(ranks.values())].sort((a, b) => a - b);

  results.innerHTML = `
    ${exampleMode ? `<div class="demo-notice">${ICON_ALERT_INFO} <span>Preset Workflow</span> — Replace with your own workflow to review your repository.</div>` : ''}
    ${message ? `<div class="demo-notice">${ICON_ALERT_INFO} <span>${escape(message)}</span></div>` : ''}
    <div class="summary">
      <div class="summary-info">
        <span class="small-label">WORKFLOW OVERVIEW</span>
        <h3>${escape(analysis.name)}</h3>
        <div class="event-list">
          <span class="event-lead">Triggers:</span>
          ${analysis.events.map(e => `<span>${escape(e)}</span>`).join('')}
        </div>
      </div>
      <div class="job-total">
        <strong>${analysis.jobs.length}</strong>
        <span>${analysis.jobs.length === 1 ? 'job' : 'jobs'}</span>
      </div>
    </div>
    <div class="stats">
      <button data-severity="high" class="stat stat-high ${severity === 'high' ? 'active' : ''}">
        <span class="stat-dot high-dot"></span>
        <strong>${high}</strong> High priority
      </button>
      <button data-severity="medium" class="stat stat-medium ${severity === 'medium' ? 'active' : ''}">
        <span class="stat-dot medium-dot"></span>
        <strong>${medium}</strong> Review
      </button>
      <button data-severity="info" class="stat stat-info ${severity === 'info' ? 'active' : ''}">
        <span class="stat-dot info-dot"></span>
        <strong>${infos}</strong> Notes
      </button>
    </div>
    <div class="tabs" role="tablist" aria-label="Analysis view">
      <button role="tab" id="map-tab" aria-controls="analysis-view" aria-selected="${tab === 'map'}" data-tab="map">
        ${ICON_DIAGRAM} <span>Job map</span>
      </button>
      <button role="tab" id="findings-tab" aria-controls="analysis-view" aria-selected="${tab === 'findings'}" data-tab="findings">
        ${ICON_SHIELD} <span>Review hints</span> <span class="tab-badge">${analysis.findings.length}</span>
      </button>
      <button id="export-json" class="json-export btn-ghost">${ICON_CODE} <span>JSON ↓</span></button>
    </div>
    <div id="analysis-view" role="tabpanel" aria-labelledby="${tab}-tab">
      ${tab === 'map' ? `
        <div class="map-caption">
          <span>REQUESTED ACCESS & DEPENDENCIES</span>
          <button id="all-jobs" class="subtle">${selectedJob ? 'Show all jobs' : 'Select a job for details'}</button>
        </div>
        <div class="graph-scroll">
          <div class="graph">
            <svg aria-hidden="true" class="edges">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8" fill="#58a6ff"/>
                </marker>
              </defs>
              <g></g>
            </svg>
            ${levels.map(level => `
              <div class="graph-level">
                ${analysis.jobs.filter(j => ranks.get(j.id) === level).map(j => {
                  const hits = analysis.findings.filter(f => f.job === j.id && f.severity === 'high').length;
                  return `
                    <button class="job-card ${selectedJob === j.id ? 'selected' : ''}" data-job="${escape(j.id)}" aria-pressed="${selectedJob === j.id}">
                      <div class="job-card-top">
                        <span class="job-icon" aria-hidden="true">${j.reusable ? ICON_REUSABLE : ICON_JOB}</span>
                        <span>${hits ? `<span class="risk-pill">${hits} high</span>` : '<span class="clean-pill">Clean</span>'}</span>
                      </div>
                      <strong>${escape(j.name)}</strong>
                      <code>${escape(j.id)}</code>
                      <p class="runner-info">${escape(j.runner)}</p>
                      <div class="access">
                        <span class="${Object.values(j.permissions).includes('write') ? 'access-write' : Object.values(j.permissions).includes('unknown') ? 'access-unknown' : 'access-read'}">
                          ${Object.values(j.permissions).includes('write') ? 'Write access' : Object.values(j.permissions).includes('unknown') ? 'Access unknown' : 'Limited access'}
                        </span>
                        <span>${j.secrets.length} secret ref${j.secrets.length === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            `).join('')}
          </div>
        </div>
        <p class="map-legend">
          <span>→</span> needs dependency &nbsp;·&nbsp;
          <span>${ICON_JOB}</span> Standard job &nbsp;·&nbsp;
          <span>${ICON_REUSABLE}</span> Reusable workflow &nbsp;·&nbsp;
          Conditions are not evaluated
        </p>
        ${chosen ? `
          <div class="job-details">
            <div class="detail-heading">
              <div class="detail-title-wrap">
                <span class="small-label">SELECTED JOB DETAILS</span>
                <h3>${escape(chosen.name)}</h3>
              </div>
              <button data-line="${chosen.line}" class="line-link">Line ${chosen.line} ${ICON_EXTERNAL}</button>
            </div>
            <dl>
              <dt>Requested token</dt>
              <dd class="code-val">${escape(permissionLabel(chosen.permissions))}</dd>
              <dt>Permission source</dt>
              <dd>${chosen.inheritedPermissions ? '<span class="badge-subtle">Inherited from workflow / repository defaults</span>' : '<span class="badge-subtle">Explicit job override</span>'}</dd>
              <dt>Secret references</dt>
              <dd class="code-val">${escape(chosen.secrets.join(', ') || 'None detected (external actions may access credentials)')}</dd>
              <dt>Actions</dt>
              <dd class="code-val">${escape(chosen.actions.join(', ') || (chosen.reusable ? 'External workflow — not expanded' : 'No uses steps'))}</dd>
              ${chosen.condition ? `<dt>Condition (not evaluated)</dt><dd class="code-val">${escape(chosen.condition)}</dd>` : ''}
            </dl>
          </div>
        ` : ''}
        <div class="section-label">
          <span>${selectedJob ? 'THIS JOB & WORKFLOW' : 'FIRST THINGS TO REVIEW'}</span>
          <button data-tab="findings" class="subtle">View all hints →</button>
        </div>
        ${findingsList(filtered.slice(0, 3))}
      ` : `
        <div class="filter-row">
          <span>${filtered.length} hint${filtered.length === 1 ? '' : 's'}${chosen ? ` · ${escape(chosen.id)} + workflow` : ''}</span>
          <button id="reset-filters" class="subtle">Show all</button>
        </div>
        ${findingsList(filtered)}
      `}
    </div>
    <details class="scope">
      <summary>What this review can’t tell you</summary>
      ${analysis.warnings.map(w => `<p>${escape(w)}</p>`).join('')}
      <p>Heuristic checks can miss risks or flag intentional patterns. No external actions or workflow code are executed.</p>
    </details>
  `;

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
    const x2 = to.left - box.left - 4; const y2 = to.top + to.height / 2 - box.top;
    const isSelectedEdge = selectedJob && (job.id === selectedJob || need === selectedJob);
    const strokeColor = isSelectedEdge ? '#58a6ff' : '#388bfd';
    const strokeWidth = isSelectedEdge ? '2.5' : '1.75';
    const opacity = selectedJob && !isSelectedEdge ? '0.3' : '0.85';
    paths.push(`<path d="M${x1},${y1} C${x1 + 24},${y1} ${x2 - 24},${y2} ${x2},${y2}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" marker-end="url(#arrow)"/>`);
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
