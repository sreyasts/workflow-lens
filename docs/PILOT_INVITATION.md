# Pilot invitation update — ready for review, not sent

Destination: existing [pilot discussion #5](https://github.com/sreyasts/workflow-lens/discussions/5). Replace its body instead of creating another recruitment thread. The current invitation lacks direct app and repository links.

## Proposed body

I maintain Workflow Lens and am looking for five maintainers who already review GitHub Actions changes to try it on one real, sanitized workflow.

**[Open the app — no install or account](https://sreyasts.github.io/workflow-lens/)** · [Source](https://github.com/sreyasts/workflow-lens)

Try this five-minute task:

1. Open a local workflow file. Identify a dependency and the permissions requested by one job.
2. Follow a review hint back to its YAML line. Did it explain something useful or get something wrong?
3. Copy the PR report and inspect the dependency diagram. Would this help another reviewer understand your change?

Reply with what you tried, what helped or confused you, and how you normally review workflows. You can also [file a review experience](https://github.com/sreyasts/workflow-lens/issues/new?template=review-experience.md) once that template is available on main. Do not post private workflows, secrets, or customer details. No workflow attachment is needed.

Workflow Lens runs its analysis locally. It is an early explanation tool, not a security audit or a replacement for actionlint or zizmor. Exported reports contain workflow metadata; inspect them before sharing.

There are currently no verified completed external reviews or repeat users. If you independently return on a later review, please identify that separately from your first trial. No stars or endorsements are requested. I will ask separately before quoting your feedback.

## Release dependency

Publish the review-experience issue template before using its link in this update. This draft does not authorize sending messages or editing the discussion.
