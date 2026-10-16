# Security

Only the latest stable versioned release is supported. The npm CLI package requires Node.js 22.18.0 or later. The moving `v0` GitHub Action tag is a convenience alias; production workflows should use a verified full commit SHA. The `v0.1.0` Git tag was moved after its initial release, so do not rely on it as an immutable reference. This is an early static reviewer; do not use its output as evidence that a workflow is secure.

See the [release policy](https://github.com/sreyasts/workflow-lens/blob/main/docs/RELEASE.md) for supported-version and release requirements.

Report application vulnerabilities through [GitHub private vulnerability reporting](https://github.com/sreyasts/workflow-lens/security/advisories/new). Do not post credentials or private workflows in public issues. The maintainer aims to acknowledge reports within 7 calendar days and provide an update at least every 30 days while an issue remains open. If private reporting is unavailable, request a private reporting channel without including vulnerability details.

False positives and missed review hints without sensitive details can be reported through the feedback issue template. Include a minimal sanitized example.

The browser app intentionally has no input-upload endpoint, persistence, or external action execution. Its YAML parser has input and complexity limits. Dependencies, browser behavior, static hosting, and supply-chain integrity still require maintenance.
