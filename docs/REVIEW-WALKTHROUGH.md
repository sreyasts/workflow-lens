# Review a permission change without leaving GitHub

This is a small synthetic exercise with inspectable inputs and actual generated output. It demonstrates a review question, not user adoption or a security benchmark.

## The review question

“Did this change give a job more requested access, and which job is affected?”

Open the [before workflow](examples/permission-change/before.yml) and [proposed workflow](examples/permission-change/after.yml). Only the `report` job's permission block changes:

```diff
   report:
     needs: test
     runs-on: ubuntu-latest
-    permissions: {}
+    permissions:
+      contents: write
+      id-token: write
     steps:
       - run: echo "Checks complete"
```

## What the tool adds

Read the [generated report](examples/permission-change/report.md):

1. The comparison identifies **Job: report → permissions**, including the explicit job override. The `test` job retains the workflow-level `contents: read` request.
2. A newly matching note points to **after line 14** and asks you to review the write-capable token request.
3. The proposed workflow report includes a Mermaid map, `test → report`, and the requested scopes for each job. This gives another reviewer a compact overview they can inspect alongside the diff.

`contents: write` requests repository-token write access. `id-token: write` requests permission to obtain an OIDC token; it is a separate capability. Neither statement proves those permissions are effective in a particular run.

The example commands only print text. The permission expansion is deliberate for demonstration and is not a recommended configuration.

## Try the same inputs in the browser

[Open the preloaded comparison](https://sreyasts.github.io/workflow-lens/?example=compare). The page labels it as synthetic.

- Inspect the `report: permissions` row.
- Collapse **Changes compared with baseline** to reach the map, then select `report`.
- Inspect requested permissions and follow **Line 14** to the proposed YAML.
- Use **Export .md** to save the comparison and proposed-workflow report locally. Review the metadata before sharing.

For a real review, open your old workflow, choose **Use current as baseline**, then open the proposed version. Your files are processed locally and are not retained across reloads. Opening your own proposed file clears the synthetic baseline; an explicitly chosen baseline is retained.

## Reproduce the checked-in report

The published npm `0.1.0` lacks comparison. With Node.js 22.18.0 or later, build the current source:

```sh
git clone https://github.com/sreyasts/workflow-lens.git
cd workflow-lens
npm ci
npm run build
node bin/workflow-lens.js docs/examples/permission-change/after.yml --compare docs/examples/permission-change/before.yml
```

The checked-in [report.md](examples/permission-change/report.md) is stdout from that final command, without editorial changes. To inspect the structured result, append `--json`. This example produces one selected field change, one newly matching note and zero high-priority hints. The source CLI exits 0 for this input; that is successful analysis, not a safety verdict.

## Inspect a real repository input too

The [self-review report](examples/self-review/report.md) was generated from this project's own [Checks workflow at commit 06527a0](https://github.com/sreyasts/workflow-lens/blob/06527a022baa6684ef868dc32883b1cd7250b09b/.github/workflows/ci.yml), using the source CLI. It shows two jobs: `workflow-security` must finish before `check`, and both request `contents: read`. There are no matching review hints; that does not establish safety.

This is maintainer self-use on an actual CI file, not an independent review or integration by someone else. The static graph also does not expand the `check` job's Node.js matrix or execute any checks. To reproduce from the same source checkout:

```sh
git show 06527a022baa6684ef868dc32883b1cd7250b09b:.github/workflows/ci.yml | node bin/workflow-lens.js -
```

The checked-in report is the CLI's unedited stdout.

## When this is useful—and when it is not

The plain diff already makes this tiny change clear. The extra value to test is whether an access/dependency overview and a portable report reduce the work of explaining a larger workflow to another reviewer. No measured time saving or independent adoption is established.

The analyzer does not execute workflows or evaluate organization policy, event restrictions or external actions. Scripts, action inputs, trigger filters, matrices and other changes may be omitted from the comparison. Continue reviewing the full diff and using [actionlint](https://github.com/rhysd/actionlint) and [zizmor](https://docs.zizmor.sh/) for their respective checks.

## Help improve a real review

If you try this on a workflow you are allowed to inspect, [report one useful, wrong or missing result](https://github.com/sreyasts/workflow-lens/issues/new?template=review-experience.md). “My normal diff was easier” is useful evidence too. A private workflow attachment, endorsement or star is not needed.
