# Validation record

Local working-tree snapshot, 16 October 2026. The changes listed here are not yet committed or present in hosted CI.

- Node.js 24.19.0 / npm 11.17.0: `npm ci` completed; 30 tests passed; production browser and CLI builds passed; `npm audit` reported 0 known vulnerabilities.
- Node.js 22.18.0: verified the official Windows archive SHA-256, then all 30 tests, TypeScript checking, and both Vite builds passed.
- `npm run inspect -- .github/workflows/ci.yml --fail-on-high` passed. The revised release workflow produced only the expected informational hint for its contents-write token.
- `npm pack --dry-run --json` succeeded and listed 19 files. This is a local package check; the npm registry returned 404 for `@sreyasts/workflow-lens`, so no package is published.
- `git diff --check` passed.
- Hosted `Checks` run [38871989772](https://github.com/sreyasts/workflow-lens/actions/runs/38871989772) passed on public `main` commit `49b5992`, including Node 22/24, CLI dogfooding, and the released composite action. It predates this local working-tree diff. The Pages deploy run [38871989795](https://github.com/sreyasts/workflow-lens/actions/runs/38871989795) also passed on that commit.
- Dependabot PRs #1–#4 are merged. Dependabot alerts and security updates are now enabled; secret scanning, push protection, and private vulnerability reporting are enabled.

The published `v0.1.0` release currently has inaccurate notes claiming npx availability and Node 20 support. A separate `v0` alias release is incorrectly marked Latest. The local support policy and release workflow are corrected in this working tree; no new tag or release was published here.

Not verified: hosted CI on this uncommitted diff, actionlint/zizmor scans, browser/device or assistive-technology coverage, an independent security audit, or the five-maintainer pilot. GitHub's latest 14-day repository traffic snapshot showed 0 views and 0 unique visitors; site visits are not measured. Stars, visits, completed reviews, repeat use, and integrations are tracked as separate measures.
