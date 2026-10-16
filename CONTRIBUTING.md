# Contributing

Run `npm ci`, `npm test`, and `npm run build` with Node.js 24+. Analysis rules live in `src/analyzer.ts`; the browser interface is in `src/main.ts`; the CLI delegates to the same analyzer.

For a parser or rule change, include a small sanitized workflow that demonstrates the problem, expected behavior, a regression test, and a primary documentation link. Include a non-triggering case when changing a heuristic. Do not submit private repository names, tokens, real secret values, or customer workflows without permission.

For interface changes, check desktop and narrow mobile layouts, keyboard navigation, invalid input, and HTML escaping. Do not introduce telemetry, file uploads, remote YAML fetching, or external font services without an explicit design discussion.

Keep changes focused. Broad automated rule additions need evidence that the behavior is useful and accurately described. Explain limitations rather than labeling a workflow safe.

Be respectful and specific in discussions. Disagreement should focus on behavior and evidence, not people.
