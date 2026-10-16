# Changelog

## Unreleased

- Add standalone CLI binary entrypoint (`bin/workflow-lens.js`) and `npx @sreyasts/workflow-lens` support.
- Add composite GitHub Action (`action.yml`) for automated CI workflow inspection.
- Add job-level container unpinned reference detection (`unpinned-container`).
- Expand script injection detection to cover `review_comment.body`, `head_commit.message`, and `inputs.*`.
- Enhance remote script execution detection to catch flags on `sudo` (e.g. `sudo -E bash`) and interpreters like `python3`.
- Refine Markdown report escaping to keep human text natural while strictly preventing Markdown/HTML injection and fence escapes.
- Copy a complete Markdown report into a PR, including a Mermaid job dependency diagram.
- Export standalone Mermaid in the browser and CLI (`--mermaid`).
- Include dynamic environment secret references alongside named secrets.
- Restore normal Tab/Shift+Tab navigation out of the source editor.
- Keep CI aligned with the supported Node.js 24 runtime and self-dogfood the CLI and composite action.
