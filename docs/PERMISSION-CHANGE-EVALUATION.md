# Which job gained requested permissions?

Evaluated on 21 October 2026: six public workflow pairs from four pull requests across four repositories. Full before/after files, pinned source URLs, SHA-256 hashes, upstream licenses, manual labels and generated reports are checked in. No upstream workflow was executed and no upstream maintainer endorsed this evaluation.

**Result:** all six comparisons reproduce the hand-labeled permission rows and workflow-default changes. Both pairs with a known requested-scope gain have **zero newly matching review hints**. Inspect the permission comparison; hint count does not answer this question.

These examples were purposefully selected and labeled by this project's maintainer. They are not a random sample, held-out benchmark, independent validation, user adoption or general security accuracy evidence. Two pairs come from the same uv PR and two from the same huggingface.js PR: these are not six independent changes.

## Answers you can check

| Public change and local report | Job | Answer from the pinned inputs |
| --- | --- | --- |
| [uv #21595](https://github.com/astral-sh/uv/pull/21595), release workflow · [report](../evaluation/public-permissions/uv-release/report.md) | `publish-docs` | **Known gain:** inherited `permissions: {}` becomes explicit `contents: read` and `id-token: write`. |
| Same uv PR, docs workflow · [report](../evaluation/public-permissions/uv-docs/report.md) | `mkdocs` | **Known gain:** the same two scopes are added over an explicit empty map. |
| [huggingface.js #2523](https://github.com/huggingface/huggingface.js/pull/2523), agents workflow · [report](../evaluation/public-permissions/hf-same-scopes/report.md) | `version_and_release` | **Same scopes:** `contents: write`, `id-token: write`, `packages: write` move from workflow inheritance to a job override. The permission source changes; this job gains no scope. |
| Same huggingface.js PR, dduf workflow · [report](../evaluation/public-permissions/hf-oidc-removed/report.md) | `version_and_release` | **OIDC request removed:** `contents: write` and `packages: write` remain. This is not removal of all write access. |
| [ostrojs/contracts #22](https://github.com/ostrojs/contracts/pull/22) · [report](../evaluation/public-permissions/ostro-explicit/report.md) | `publish-npm` | **Unknown baseline → explicit map:** old repository defaults are unresolved; new requests are `contents: read` and `id-token: write`. The complete old/new access budget cannot be compared from these inputs alone. |
| [cli/cli #11322](https://github.com/cli/cli/pull/11322) · [report](../evaluation/public-permissions/cli-deny-default/report.md) | `issue`, `pull_request` | **Unknown baseline → explicit empty map:** the workflow now requests no scopes for either job. The previous repository-default budget remains unknown. |

`id-token: write` requests an OIDC token, not repository-content write access. These answers describe requested configuration, not effective runtime access. GitHub documents [permission scopes, defaults and job overrides](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions); fork/event restrictions and organization policy can affect runtime access.

## Reproduce locally

Requires Node.js 22.18.0 or later. From the current source checkout:

```sh
npm ci
npm run evaluate:permissions
```

The evaluation needs no network once dependencies are installed. Expected summary:

```json
{"workflowPairs":6,"pullRequests":4,"repositories":4,"matched":6,"knownGainPairs":2,"hintCountProxyMisses":2}
```

The evaluator checks the exact set of job permission rows and whether workflow defaults changed, verifies source/license hashes, and rejects stale reports/results. It runs in CI on Node.js 22.18.0 and 24. To inspect one pair with the source CLI:

```sh
npm run build
node bin/workflow-lens.js evaluation/public-permissions/uv-release/after.yml --compare evaluation/public-permissions/uv-release/before.yml
```

Published npm `0.1.0` lacks `--compare`; use the source checkout. Neither command executes YAML steps, calls actions or contacts source repositories.

## What is scored

[labels.json](../evaluation/public-permissions/labels.json) records manual judgments and expected before/after scopes with their inheritance source. [results.json](../evaluation/public-permissions/results.json) records observed rows, errors, matches, the deliberately weak hint-count proxy, and analyzer/comparator hashes.

`knownGain: false` means that a gain is not established by that label. It includes unknown-baseline cases; it must not be treated as a definitive negative label for a binary accuracy calculation.

The engine does **not** produce the prose “known gain / same scopes / unknown baseline” classifications. Those are maintainer interpretations of the original YAML and comparison rows. This is a bounded regression check, not an automatic gain classifier or a check of every field and hint in each workflow.

## Mistakes exposed by this exercise

1. **Using new hints as a change detector misses both known gains.** Neither uv pair adds a repository write-token warning: the added write scope is OIDC. The zero-new-hints shortcut misses both requested-scope expansions, while the permission rows show them. This is a failure of that proposed shortcut, not a claim that the tool promises such a detector.
2. **Calling every changed permission row a gain is wrong.** The agents case changes inheritance with identical scopes. The dduf case removes OIDC while retaining two write scopes.
3. **Treating unknown defaults as empty invents certainty.** The ostro and CLI baselines omit a permission map. The tool retains `*: unknown`; this evaluation does not assert a complete previous request budget.
4. **Token configuration is not total credential access.** The uv docs change also configures brokered-token permissions in action inputs. Those external credentials are outside this comparator's permission-map projection. Its permission row is insufficient to review the whole change.

No analyzer rule was changed to fit these cases. All six pairs parsed and their permission projections matched; this selected run found no permission-row mismatch. The mistakes above concern inference and coverage, rather than secretly failing comparison tests.

## Limits and untested cases

- Job overrides replace the workflow default; they are not merged with it. Repository defaults and external actions/reusable workflows are unresolved.
- These pairs do not test added/removed/renamed jobs, `read-all`/`write-all`, permission expressions or every available scope. Job IDs identify jobs. A new/removed ID appears in the jobs-list delta rather than a same-job permission row; absence of that row does not establish unchanged access.
- Scripts, action inputs, trigger filters, matrices and external credentials may be omitted. The ordinary diff remains required.
- This measures selected permission fields, not exploitability, all workflow semantics, time saved or repeat use. Labels are not independently reviewed; selection was exploratory, not blind.
- PR base/head commits are pinned in the source manifest. These are historical snapshots, not the latest upstream workflows. No workflow file is executed.

## Sources and updates

[sources.json](../evaluation/public-permissions/sources.json) links every PR and exact before/after commit, with upstream notices under [licenses](../evaluation/public-permissions/licenses). Snapshots were downloaded without content edits. Hashes normalize CRLF to LF so Git checkout settings do not change results.

After intentional analyzer or label changes, run `npm run evaluate:permissions -- --write`, inspect the report/result diffs and explain changed judgments. Do not silently remove inconvenient examples or present this curated count as population accuracy.
