# Contributing

Run `npm ci`, `npm test`, and `npm run build` with Node.js 24+. Analysis rules live in `src/analyzer.ts`; the browser interface is in `src/main.ts`; the CLI delegates to the same analyzer.

For a parser or rule change, include a small sanitized workflow that demonstrates the problem, expected behavior, a regression test, and a primary documentation link. Include a non-triggering case when changing a heuristic. Do not submit private repository names, tokens, real secret values, or customer workflows without permission.

Run `npm run evaluate` for the labeled privileged-checkout cases. See [the evaluation record](docs/EVALUATION.md) for reproduction commands, label provenance, metrics and limits. Add examples and their expected behavior before adjusting a rule; passing these synthetic cases does not establish general security accuracy.

For interface changes, check desktop and narrow mobile layouts, keyboard navigation, invalid input, and HTML escaping. Do not introduce telemetry, file uploads, remote YAML fetching, or external font services without an explicit design discussion.

After building, run `npx playwright install chromium` once and `npm run test:e2e` for browser regressions. Node.js 24 CI runs these checks in Chromium, including delayed file reads, exports, keyboard focus and 390px/1280px layouts. Use synthetic or sanitized inputs only; the test runner opens the local preview on port 4175.

Keep changes focused. Broad automated rule additions need evidence that the behavior is useful and accurately described. Explain limitations rather than labeling a workflow safe.

Be respectful and specific in discussions. Disagreement should focus on behavior and evidence, not people.
