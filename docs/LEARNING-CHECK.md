# Understanding this change

This is a learning checklist, not a claim that the project owner independently implemented or understands the change. The evaluation and fix were AI-assisted.

## Trace the code

1. Open `src/analyzer.ts` and find `analyze(source)`. Identify its input type, output type and early input limits.
2. Trace a YAML document through `parseDocument`, `doc.toJS`, the job loop and the step loop.
3. Explain why `expressionCode` removes string-literal contents but normalizes literal bracket property access.
4. Locate the `privileged-checkout` condition. Explain all three requirements: privileged trigger, checkout action and a selector with a recognized untrusted origin.
5. Explain why `with.path` must not be treated like `with.ref` or `with.repository`.

## Predict before running

For each input, write whether this specific rule should appear and why:

```yaml
on: pull_request_target
permissions: {}
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        with:
          persist-credentials: false
          ref: ${{ github['event']['pull_request']['head']['sha'] }}
```

Then replace only `ref` with `path`. Next replace its value with `${{ github.event.pull_request.base.sha }}`. Distinguish the checkout-specific hint from the separate privileged-trigger hint. Do not execute these workflows; inspect them locally with the CLI.

## Demonstrate understanding independently

- Without asking AI for code first, add a new positive/negative fixture pair with a clear reason and a primary source. Predict the outcomes before running the evaluation.
- Read one reported mismatch and explain whether the label or the analyzer should change. Preserve failed outcomes in your notes.
- Explain TP, FP, TN and FN, and why input errors must not count as true negatives.
- Name two workflows this rule could still miss. Explain why 20/20 here is not 100% real-world security accuracy.
- Give a two-minute explanation of the defect, fix, evidence and limits without reading this document.

If you cannot explain a step, study that specific TypeScript/YAML concept and repeat the exercise. More generated commits are not a substitute for this check.
