# Privileged checkout evaluation — 19 October 2026

## Question and scope

Does `privileged-checkout` identify an explicit selection of PR/run-head code by `actions/checkout` under `pull_request_target` or `workflow_run`, without treating a destination directory or context-looking constant as such a selection?

This measures one rule's presence/absence, not every finding, exploitability, token availability, runtime behavior, or general workflow safety. A triggering workflow still needs a human trust review. A non-triggering case is not labeled safe.

## Cases and label provenance

[The fixture file](../evaluation/privileged-checkout.json) defines 20 synthetic cases: ten expecting the rule and ten not expecting it. Every case has an ID, inputs, expected result and rationale. The runner renders complete single-job YAML with an explicitly pinned checkout and disabled credential persistence. No workflow is executed or uploaded.

Labels and the development/confirmation split were written before the analyzer fix. Twelve development cases guided the fix. Eight confirmation cases check additional variants. The same AI assistant authored the labels, runner and fix and could see all fixtures; **the confirmation split is not an independent or blind holdout**. The original analyzer was also run against all cases to capture the baseline. These examples were deliberately chosen to probe suspected weaknesses, not sampled from production workflows.

Label rationale follows primary sources:

- [GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts): index/property syntax, `github.head_ref`, and base/head context distinctions.
- [GitHub expression syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions): quoted constants and expression evaluation.
- [actions/checkout](https://github.com/actions/checkout): `repository` and `ref` select code; `path` chooses the checkout directory.
- [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use): untrusted code and privileged workflow trust boundaries.

## Reproduce

Use a source checkout with Node.js 22.18.0+ and Git. Local measurements used Node.js 24.19.0.

```sh
npm ci
npm run evaluate
npm run evaluate -- --split development
npm run evaluate -- --split confirmation
node scripts/evaluate.ts --json
npm run evaluate:compare -- c8745812a2d3c390d0a56b26730d01fec08403d2
npm test
npm run build
```

The comparison command loads and executes the historical analyzer from the selected Git revision; use only trusted revisions. It writes a uniquely named temporary module inside `evaluation/` and removes it afterward. A shallow clone must fetch the baseline commit first. Comparison output contains both runs and the baseline commit. Archived [baseline](../evaluation/results/baseline.json) and [current](../evaluation/results/current.json) outputs include SHA-256 hashes of the fixture and analyzer source, plus every case outcome. Hashing normalizes CRLF to LF so Windows and Linux checkouts agree. Output is deterministic for unchanged source and fixtures; npm's command banner is omitted when invoking `node` directly.

Exit codes: 0 means all selected expectations match, 1 means a mismatch or analyzer input error, and 2 means a runner/configuration error. `--allow-failures` supports baseline inspection without exiting 1. Unknown arguments are rejected. Analyzer input errors fail the case and are excluded from the confusion matrix rather than counted as true negatives.

## Results

Baseline commit: `c8745812a2d3c390d0a56b26730d01fec08403d2`.

| Measure | Baseline | Changed analyzer |
| --- | ---: | ---: |
| Case expectations met | 10/20 | 20/20 |
| True positives | 5 | 10 |
| False negatives | 5 | 0 |
| True negatives | 5 | 10 |
| False positives | 5 | 0 |
| Analyzer input errors | 0 | 0 |
| Precision on these cases | 0.50 | 1.00 |
| Recall on these cases | 0.50 | 1.00 |
| Development expectations met | 5/12 | 12/12 |
| Confirmation expectations met | 5/8 | 8/8 |

Precision = TP / (TP + FP); recall = TP / (TP + FN). A zero denominator is reported as null, not a perfect score. No confidence interval or population accuracy claim is justified by this small, intentionally selected set.

## Change and remaining limitations

Previously the rule scanned every checkout input as plain text. It missed literal bracket lookups and `github.head_ref`, and flagged checkout directories and quoted constants. The change restricts inspection to `ref` and `repository`, reuses the existing expression lexer, and recognizes direct PR head / workflow-run head selectors. Literal `refs/pull/` selection remains a review signal.

Computed property keys, aliases through `env`/`matrix`/step outputs, dynamically constructed ref strings, condition evaluation, shell-based Git checkouts and external action behavior remain unresolved. `workflow_run` can refer to trusted runs; detecting its head is a request for review, not proof of an attack. A directory or literal containing `refs/pull/` inside a selector can still need manual interpretation. This is a lexical heuristic, not a complete expression interpreter or taint analysis.

The next useful external check is a reviewer-labeled set of sanitized real workflows, with labels frozen before comparison and disagreements retained. These results do not count as independent users, maintainer adoption, a research publication, or the project owner's demonstrated independent coding ability.
