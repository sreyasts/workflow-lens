# Adoption experiment

Status at creation, 16 October 2026: no verified external users, no verified independent stars, and no market validation. The code is a prototype for testing a workflow-review hypothesis. Technical risk is documented; demand is still uncertain.

## Who it serves

Maintainers reviewing GitHub Actions workflow changes who want to understand job dependencies and access before executing anything. The hypothesis is that a local visual explanation complements existing CLI scanners. It is not a claim of unique features, better detection, or proven demand.

Evidence of the underlying problem: [GitHub's secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) describes least-privilege tokens, script injection, third-party actions, and privileged checkout risks. [zizmor](https://docs.zizmor.sh/) and [actionlint](https://github.com/rhysd/actionlint) already address parts of this space. This evidence establishes a real technical problem and competition, not willingness to use this app.

## First fourteen days

1. Demonstrate the bundled PR example in a short screen recording. Show the local-only processing and limitations.
2. Recruit five independent maintainers who already review workflow files. Ask permission before using their workflows. Have each use a sanitized workflow and explain requested permissions and a dependency in their own words.
3. Observe where the tool changes or confuses their understanding. Compare against their normal review method, including existing scanners. Do not count a demo view as an active user.
4. Fix the largest observed problem and ask whether they independently use it again on a later workflow change.
5. Continue only if at least three voluntarily return or integrate the CLI into an actual workflow. If they prefer their current tools, change the scope or contribute upstream instead of adding features speculatively.

These are experiment gates, not forecasts or OpenAI eligibility rules. No outreach has been sent. Suggested channels, subject to their posting rules: relevant maintainer communities, GitHub Actions discussions, and a focused technical demonstration. Do not mass-message maintainers or post unsolicited security findings.

## Honest measures

Record consenting testers, meaningful completed reviews, repeat usage, external reports, and downstream integrations separately. Repository stars, page visits, and downloads are visibility signals; none establishes retention. Do not count your own accounts or a friend's extra accounts as independent interest. Do not buy, trade, or incentivize stars. No analytics or remote user data collection is implemented.

## OpenAI program

The [official program](https://developers.openai.com/community/codex-for-oss) advertises six months of ChatGPT Pro including Codex, plus conditional Security access and possible API credits. The official page publishes no numerical star threshold. Selection considers maintainer and ecosystem evidence and is discretionary under the [program terms](https://learn.chatgpt.com/docs/codex-for-oss-terms).

Build because the tool is useful even without a grant. Apply with accurate evidence when available. Never label test activity, self-authored issues, or synthetic examples as real community adoption.

## What would change the direction

- Maintainers can already get the explanation faster from their existing tools.
- Conditions or cross-file behavior cause confusing or misleading maps.
- Three independent teams request a different narrow capability repeatedly.
- Maintenance time exceeds the value users receive.

## Deferred until evidence exists

Repository OAuth, remote scanning, automatic pull requests, AI explanations, account systems, paid tiers, public vulnerability reports, and fabricated project-health or star badges.
