# Product review — 16 October 2026

## Conclusion

The most likely failure mode is a useful-looking demo that maintainers try once and never need again. This is a hypothesis, not evidence that the project will fail. The repository has no verified repeat-user evidence. More features or stars cannot establish that evidence.

## Evidence and competing arguments

| Risk | Evidence | Strongest counterargument | Decision |
| --- | --- | --- | --- |
| Weak differentiation | [actionlint](https://github.com/rhysd/actionlint) validates workflows; [zizmor](https://docs.zizmor.sh/) performs security analysis. Workflow Lens explicitly implements only bounded heuristics. | A local visual explanation can make review easier for people who do not want scanner output alone. | Focus the promise on explaining a workflow and carrying the explanation into a PR. Do not compete on detection breadth without benchmarks. |
| One-time demo use | Before this change, exports contained text but no dependency diagram; users manually moved between the app and their review. | Local paste-and-review avoids account setup and credential access. | Preserve that low-friction entry; add a copyable report and diagram. Measure whether these are actually reused. |
| Trust loss from incorrect output | Code inspection found dynamic workflow-level env secret expressions missing from the inventory and unescaped workflow text in Markdown exports. | Bounded parsing, explicit limitations, and regression tests provide a foundation for review. | Fix observed defects and add regressions before expanding rules. Neither these fixes nor a zero-hint report prove security. |
| Keyboard friction | The source editor intercepted every Tab, including Shift+Tab, without an exit mechanism. | In-editor indentation is convenient for mouse users. | Restore ordinary focus navigation; keep editing simple. |
| Distribution mistaken for demand | The GitHub repository showed 1 star and 0 forks on 16 October 2026; repository traffic showed 0 views over 3–16 October. These are dated visibility measures, not evidence of completed reviews or retention. | The project is early; low visibility does not prove absence of need. | Run the five-maintainer experiment in ADOPTION.md before claiming traction. |

GitHub supports Mermaid diagrams in Markdown: [official documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams). This makes reports portable to the place where maintainers already review changes. It does not prove users want the feature.

## Shipped on main by v0.1.0

- Copy a complete PR report, with visible clipboard failure guidance.
- Mermaid dependency export in the app and CLI; invalid workflows cannot export a diagram.
- Escape untrusted report content and use generated diagram node IDs.
- Preserve dynamic secret references even when named references also exist.
- Remove the source editor's keyboard trap.
- Add a one-minute onboarding path, explicit tool comparison, CLI redirection examples, and a contribution checklist.

## Next evidence gate

Use the existing [adoption experiment](ADOPTION.md) and [interview script](LAUNCH.md). Recruit five independent maintainers through permissioned outreach. Observe an actual sanitized workflow review, ask where this changes their understanding, and record whether they voluntarily return for another review. Three voluntary returns or real CLI integrations within the experiment is a chosen decision gate, not an industry benchmark.

If reviewers cannot explain a concrete time saving or prefer their current tooling, narrow the product or stop. If multiple reviewers independently ask for before/after access comparison, prioritize that over accounts, AI summaries, or more generic scanner rules. If output misleads them, fix correctness before distribution.

Release `v0.1.0` and the Pages deployment are public. The [adoption ledger](ADOPTION.md#evidence-ledger) records one public opt-in recruitment post and zero completed external reviews or voluntary repeats as of 16 October 2026. Stars and page visits remain separate visibility measures. Public source: https://github.com/sreyasts/workflow-lens.
