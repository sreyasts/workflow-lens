# Maintainer Adoption and Outreach Playbook

The [OpenAI Codex for Open Source program](https://developers.openai.com/community/codex-for-oss) offers six months of ChatGPT Pro with Codex to selected maintainers. API credits are separate and conditional. The public criteria name maintainer role, project use, and ecosystem importance; they publish no minimum star or traffic count. Admission is discretionary, so do not present any metric here as an eligibility threshold.

These are unsent drafts and an experiment plan, not proof of usage. Repo stars, page visits, completed reviews, and voluntary repeat use must be counted separately.

---

## 1. Curated Directory Submission — `awesome-actions`

Submit a pull request to [sdras/awesome-actions](https://github.com/sdras/awesome-actions) (25k+ stars), the primary curated index for GitHub Actions:

- **Section**: Utility Actions / Testing & Linting
- **Suggested Entry**:
```markdown
* [Workflow Lens](https://github.com/sreyasts/workflow-lens) - Client-side inspector and Action to review job dependencies, requested permissions, secret references, and review hotspots.
```

---

## 2. Reddit Launch Posts

### Subreddit: `r/devops` & `r/github`

**Title:**
> I built a lightweight, client-side tool to visualize GitHub Actions dependencies & review permissions

**Body:**
```text
Hey everyone,

Reviewing PRs that modify `.github/workflows/*.yml` can be stressful—especially when checking for least-privilege tokens, mutable action tags, and script injection risks.

I built **Workflow Lens** (https://sreyasts.github.io/workflow-lens/), an open-source tool that turns YAML into an interactive dependency map and review report.

Key points:
- **100% Client-side**: Your YAML stays in your browser. No accounts, no telemetry, no cloud backend.
- **Visual Map**: Automatically calculates and draws job dependencies (`needs`).
- **Access Overview**: Aggregates job permission overrides, workflow defaults, and named secret references.
- **One-Click PR Report**: Exports a ready-to-paste GitHub PR Markdown comment with a rendered Mermaid diagram.
- **CLI & GitHub Action**: The published CLI requires Node.js 22.18.0 or later; pin the composite action to a verified full commit SHA.

Repo: https://github.com/sreyasts/workflow-lens
Web app: https://sreyasts.github.io/workflow-lens/

Feedback and sanitized PR workflow examples are welcome!
```

---

## 3. Optional GitHub Action Marketplace listing

If you decide to submit the action to the Marketplace, first verify the current submission requirements and confirm the tagged source and support policy are accurate. A listing is distribution, not evidence of use or repeat use.

---

## 4. One-on-One Maintainer Outreach Template

Reach out to 5 maintainers of open source projects (Go, Python, TypeScript, Rust) who actively review PRs:

```text
Hi [Name],

I saw your recent work on [Repository Name]. When reviewing CI changes, do you find it tedious to track job dependencies and token permissions across YAML files?

I created a small open-source tool called Workflow Lens (https://sreyasts.github.io/workflow-lens/). Its browser app visualizes job dependencies and requested permissions, shows selected static review hints, and exports a Mermaid PR report you can review and paste yourself.

If you have a couple minutes, could you test your workflow in it and let me know if the visual breakdown is useful?

Thank you for your time and open-source contributions!
```

---

## 5. Evidence gates before an application

| Milestone | Target Metric | Purpose |
| :--- | :--- | :--- |
| **Stage 1: Pilot** | Five independent maintainers invited; record consented completed reviews | Test whether the explanation helps with real workflow reviews |
| **Stage 2: Repeat use** | Count voluntary later reviews separately from first sessions | Measure retention, not stated intent |
| **Stage 3: Integration** | Verify outside repositories using the action or CLI | Record adoption separately from stars and page visits |
| **Stage 4: Application** | Submit only verified maintainer/use evidence; state current gaps | OpenAI's decision is discretionary; no benefit is guaranteed |

Do not request API credits without a real planned API workflow and a human review boundary. This product currently makes no API calls.
