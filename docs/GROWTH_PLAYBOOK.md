# Real User Adoption & Star Growth Playbook

To qualify for the **OpenAI Codex for Open Source** program (6 months of ChatGPT Pro + API credits), the repository needs demonstrated community usage, active weekly traffic, and GitHub stars.

This playbook provides copy-paste promotional posts, launch channels, and maintainer outreach templates.

---

## 1. Hacker News — Show HN Launch Post

**Title:**
> Show HN: Workflow Lens – Visual GitHub Actions dependency & permission reviewer

**Body:**
```text
Hey HN,

I built Workflow Lens (https://sreyasts.github.io/workflow-lens/), a client-side visual tool to inspect GitHub Actions workflows before merging them.

Whenever I review pull requests that modify CI/CD workflows, it's hard to spot risky privilege escalations, dynamic secret references, or unpinned dependencies just by reading lines of YAML diffs.

Workflow Lens runs completely inside your browser (zero servers, zero uploads, no analytics, no AI API calls):
1. Renders a live Mermaid dependency graph of your jobs (based on `needs`).
2. Extracts all requested token scopes (contents, write-all, id-token) and secret references.
3. Flags security review hotspots (e.g. untrusted PR head checkout under pull_request_target, mutable action references, shell injection).
4. Generates a copy-paste PR Markdown review report with the embedded Mermaid diagram for your team.

You can also run it via npx or in CI:
`npx @sreyasts/workflow-lens .github/workflows/*.yml`

Or as a GitHub Action:
`uses: sreyasts/workflow-lens@main`

Live web app: https://sreyasts.github.io/workflow-lens/
Source code: https://github.com/sreyasts/workflow-lens

I would love feedback from maintainers and DevOps folks: does this make your workflow review faster? What edge cases or heuristics would you like to see?
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
- **CLI & GitHub Action**: Can be run via `npx @sreyasts/workflow-lens <file>` or automated in your CI with `action.yml`.

Repo: https://github.com/sreyasts/workflow-lens
Web app: https://sreyasts.github.io/workflow-lens/

Feedback and sanitized PR workflow examples are welcome!
```

---

## 3. GitHub Action Marketplace Listing

To get high-intent organic users discovering your tool every day:
1. Navigate to your repository on GitHub.
2. In the right-hand sidebar or Releases page, click **Draft a release**.
3. Select the checkbox: **"Publish this Action to the GitHub Community Action Marketplace"**.
4. Category: **Code quality** / **Continuous integration**.
5. Once published, your Action appears in GitHub's official search when developers search for "workflow", "security", or "review".

---

## 4. One-on-One Maintainer Outreach Template

Reach out to 5 maintainers of open source projects (Go, Python, TypeScript, Rust) who actively review PRs:

```text
Hi [Name],

I saw your recent work on [Repository Name]. When reviewing CI changes, do you find it tedious to track job dependencies and token permissions across YAML files?

I created a small, zero-install open-source tool called Workflow Lens (https://sreyasts.github.io/workflow-lens/). It runs completely in the browser, draws a visual DAG of jobs, flags unpinned actions/script injections, and generates a Mermaid PR review comment.

If you have a couple minutes, could you test your workflow in it and let me know if the visual breakdown is useful?

Thank you for your time and open-source contributions!
```

---

## 5. Target Milestones for OpenAI Grant Submission

| Milestone | Target Metric | Purpose |
| :--- | :--- | :--- |
| **Stage 1: Launch** | 50+ Stars, 100+ visits | Initial social proof from Show HN & Reddit |
| **Stage 2: Integration** | 5+ external repos using `action.yml` | Proof of downstream utility |
| **Stage 3: Community** | 3+ external issues/PRs filed | Proof of active maintenance |
| **Stage 4: Application** | Submit form to OpenAI OSS program | Claim 6 months of ChatGPT Pro ($1,200 value) |
