# Initial validation

16 October 2026, version 0.1.0.

- 20 Node regression tests passed, covering source locations, YAML triggers, permission replacement, unknown defaults, pinned references, direct interpolation versus environment-variable input, secret references, reusable workflows, malformed/unsupported YAML, dependencies, cycles, input bounds, containers, reports, and CLI exit codes.
- TypeScript checking and Vite production build passed locally and in GitHub Actions.
- `npm audit` reported zero known vulnerabilities in the installed dependency graph at validation time. This is not a security audit.
- Browser checks passed for job selection, source-line selection, examples, invalid input and export disabling, HTML escaping, severity filters, local file import, and JSON download content.
- Desktop job map rendered its dependency edge. A 390px viewport had no document-level horizontal overflow; graph content can scroll within its panel.
- No browser warning/error logs were reported in the inspected interactions.
- App input was not used to execute workflow code or sent to a remote analysis service.

Known limits: no cross-browser/device matrix, assistive-technology audit, independent security audit, real-user pilot, exhaustive expression parsing, or runtime policy validation. GitHub Actions may emit platform deprecation notices for pinned action versions; dependency updates are tracked by Dependabot.

No external adoption is inferred from these checks, CI runs, dependency update PRs, or the release.
