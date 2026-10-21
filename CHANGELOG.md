# Changelog

## 0.1.1 — unreleased

- Add a shareable synthetic comparison example and shorter candid-feedback prompt; keep example and real-workflow baselines separate.
- Compare baseline and proposed workflows locally in the browser and CLI, including selected access/dependency changes and duplicate-aware hint differences; export Markdown and JSON with explicit comparison limits.
- Add GitHub Actions job summaries so workflow review reports remain visible outside the raw step log, including reviews that fail on high-priority hints.
- Recognize equivalent untrusted-context expressions with whitespace around property access and avoid credential-persistence hints for explicit string false inputs.
- Limit privileged checkout hints to repository/ref selectors; inspect actual expressions, including literal bracket properties and head_ref, while ignoring context-like literals and destination paths.
- Add a reproducible 20-case privileged-checkout evaluation with per-case labels, source hashes, confusion matrices, historical comparison and CI checks.
- Restrict secret inventory and script-interpolation hints to separate expression bodies; ignore quoted literal values, normalize literal bracket properties, and deduplicate case-insensitive secret names.
- Detect explicit self-hosted labels in object-form runner configuration and reject malformed dependency lists before drawing a map.
- Prevent delayed file reads from overwriting later edits, Clear, or a newer file; show file errors even when the editor is empty.
- Preserve keyboard focus when job cards, filters and tabs redraw; treat a cleared editor as ready instead of a syntax error.
- Replace the job-card "Clean" claim with "No high hints" and distinguish requested OIDC permission from repository-token write permission.
- Add browser regression coverage for race handling, report downloads, theme persistence, keyboard navigation and mobile layout to the Node.js 24 CI check.
- Correct npm package README, metadata, and support policy; ship only the CLI bundle and required docs.
- Treat GitHub self-repository action and workflow references as commit-pinned; show the moving `v0` channel in the app header.
- Add actionlint and zizmor to CI; add seven-day Dependabot cooldowns and disable release caches.
- Isolate npm OIDC publishing from the GitHub release job.
- Align the declared Node.js minimum with the TypeScript stripping support required by the CLI.
- Bound CLI reads before loading large files, and confine composite-action input paths to the checked-out workspace.
- Harden the release workflow to validate version tags, avoid shell interpolation, use pinned actions, and take notes from the matching changelog entry.
- Expand regression coverage for every supported untrusted GitHub Actions context.
- Narrow the app copy to its visual explanation and PR-report scope, and improve subtle-text contrast.

## 0.1.0 — 2026-10-16

- Publish the CLI package as `@sreyasts/workflow-lens@0.1.0`; it requires Node.js 22.18.0 or later.
- Add composite GitHub Action (`action.yml`) for automated CI workflow inspection.
- Add job-level container unpinned reference detection (`unpinned-container`).
- Expand script injection detection to cover `review_comment.body`, `head_commit.message`, and `inputs.*`.
- Enhance remote script execution detection to catch flags on `sudo` (e.g. `sudo -E bash`) and interpreters like `python3`.
- Refine Markdown report escaping to keep human text natural while strictly preventing Markdown/HTML injection and fence escapes.
- Copy a complete Markdown report for a PR, including a Mermaid job dependency diagram.
- Export standalone Mermaid in the browser and CLI (`--mermaid`).
- Include dynamic environment secret references alongside named secrets.
- Restore normal Tab/Shift+Tab navigation out of the source editor.
- Test the CLI and composite action in GitHub Actions on Node.js 22 and 24.

The `0.1.0` package was published on 2026-10-16 with an inaccurate README; npm versions cannot be replaced. Version `0.1.1` is prepared as a release candidate and has not been published. The existing GitHub release descriptions were corrected on 2026-10-16.
