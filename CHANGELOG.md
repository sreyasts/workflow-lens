# Changelog

## Unreleased

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

The `0.1.0` package was published on 2026-10-16. Its immutable npm README still needs correction in a later version. The existing GitHub release descriptions were corrected on 2026-10-16.
