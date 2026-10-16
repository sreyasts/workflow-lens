# Security

Only the latest release is supported. This is an early static reviewer; do not use its output as evidence that a workflow is secure.

Report application vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/sreyasts/workflow-lens/security/advisories/new) when enabled. Do not post credentials or private workflows in public issues. If private reporting is unavailable, request a private reporting channel without including vulnerability details.

False positives and missed review hints without sensitive details can be reported through the feedback issue template. Include a minimal sanitized example.

The browser app intentionally has no input-upload endpoint, persistence, or external action execution. Its YAML parser has input and complexity limits. Dependencies, browser behavior, static hosting, and supply-chain integrity still require maintenance.
