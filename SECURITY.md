# Security

The latest stable versioned release is supported (currently `v0.1.0`). The moving `v0` GitHub Action tag is an alias. The published `v0.1.0` Git tag was moved after its initial release; use the current full commit SHA for reproducible workflows. The npm package `@sreyasts/workflow-lens@0.1.0` is published and requires Node.js 22.18.0 or later. This is an early static reviewer; do not use its output as evidence that a workflow is secure.

Report application vulnerabilities through [GitHub private vulnerability reporting](https://github.com/sreyasts/workflow-lens/security/advisories/new). Do not post credentials or private workflows in public issues. The maintainer aims to acknowledge reports within 7 calendar days and provide an update at least every 30 days while an issue remains open. If private reporting is unavailable, request a private reporting channel without including vulnerability details.

False positives and missed review hints without sensitive details can be reported through the feedback issue template. Include a minimal sanitized example.

The browser app intentionally has no input-upload endpoint, persistence, or external action execution. Its YAML parser has input and complexity limits. Dependencies, browser behavior, static hosting, and supply-chain integrity still require maintenance.
