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

These are experiment gates, not forecasts or OpenAI eligibility rules. A public, opt-in recruitment call was posted in [GitHub Discussions](https://github.com/sreyasts/workflow-lens/discussions/5) on 16 October 2026. Three individually approved invitations were sent on 17 October, roughly 101 seconds apart. No replies or delivery-failure notices were found at the next check that day; this does not establish delivery, reading, or use. Do not mass-message maintainers or post unsolicited security findings.

## Honest measures

Record consenting testers, meaningful completed reviews, repeat usage, external reports, and downstream integrations separately. Repository stars, page visits, and downloads are visibility signals; none establishes retention. Do not count your own accounts or a friend's extra accounts as independent interest. Do not buy, trade, or incentivize stars. No analytics or remote user data collection is implemented.

## Evidence ledger

Pilot measures are the 17 October 2026 snapshot; GitHub stars and npm downloads were checked again on 19 October. Other historical windows are identified below. A discussion reply is interest only; it is not a review or user.

| Measure | Count | Meaning |
| --- | ---: | --- |
| Public opt-in recruitment posts | 1 | [Discussion #5](https://github.com/sreyasts/workflow-lens/discussions/5) |
| Individual invitations sent | 3 | Sending is not delivery, consent, or use; contact details stay private |
| Replies to the recruitment post | 0 | No interest expressed yet |
| Independent maintainer opt-ins | 0 | No participants verified yet |
| Completed review sessions | 0 | No workflow task completed with a participant |
| Voluntary repeat reviews | 0 | No later use observed or reported |
| External reports or integrations | 0 | None verified |
| GitHub stars, checked 19 October | 1 | The sole [stargazer](https://api.github.com/repos/sreyasts/workflow-lens/stargazers) is the maintainer, `sreyasts`; 0 verified independent stars |
| GitHub forks | 0 | No downstream fork observed |
| GitHub repository views/clones, 3–16 October | 0 / 0 | Historical snapshot; Pages traffic is not measured |
| npm downloads, 19 September–18 October | 175 | [Official npm API](https://api.npmjs.org/downloads/point/last-month/@sreyasts/workflow-lens), checked 19 October; [archived response](evidence/2026-10-19-npm-downloads.json) |

The earlier 16–17 October checks returned HTTP 404; that historical result did not establish zero downloads. The successful 19 October response counts download events, not unique users. Maintainer, CI, and bot activity may be included; independent downloads and repeat use cannot be determined from this total. No independent adoption is verified by this snapshot.

## Maintainer evidence

Use completed workflow reviews and voluntary repeat use to decide what to improve. Repository visibility and release activity alone do not establish that the tool helps maintainers.

After at least three of five pilot maintainers voluntarily return or integrate it, broaden recruitment and record real downstream use. This is a project decision gate. Never label test activity, self-authored issues, or synthetic examples as real community adoption.

## What would change the direction

- Maintainers can already get the explanation faster from their existing tools.
- Conditions or cross-file behavior cause confusing or misleading maps.
- Three independent teams request a different narrow capability repeatedly.
- Maintenance time exceeds the value users receive.

## Deferred until evidence exists

Repository OAuth, remote scanning, automatic pull requests, AI explanations, account systems, paid tiers, public vulnerability reports, and fabricated project-health or star badges.
