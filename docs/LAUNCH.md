# Launch kit

Drafts for review. Nothing here has been posted or sent. Follow each community's self-promotion rules and disclose that you maintain the project.

## Short public post

I built Workflow Lens, a small open-source tool for understanding GitHub Actions workflows before running them.

Open a local YAML file to see job dependencies, requested token permissions, secret references, and source-linked review hints. It runs in your browser without uploading the workflow or requiring an account. There is also a CLI with Markdown and JSON output.

It is an early explanation tool, not a replacement for zizmor, actionlint, or a security review. It does not evaluate conditions or inspect external actions. The published `npx @sreyasts/workflow-lens <workflow.yml>` CLI requires Node.js 22.18.0 or later. A versioned GitHub Action release (`v0.1.0`) is also available; production workflows should pin its verified full commit SHA.

If you maintain a repository with GitHub Actions: does this help you review a real workflow change? I am particularly interested in confusing output, false positives, and things your existing tools explain better. Please share only sanitized examples.

Try it: https://sreyasts.github.io/workflow-lens/
Source: https://github.com/sreyasts/workflow-lens

## 45-second demo

1. Open the PR trust-boundary example and identify `pull_request_target`.
2. Select the test job and show the requested write access.
3. Select the interpolation hint's line link to reveal the original expression.
4. Show the review advice and the limitations.
5. Open the minimal CI example to compare a workflow with no matching hints. Explain that zero hints is not a safety verdict.
6. Show the local file input and report export. End with an invitation to test a real sanitized workflow.

## Five-user interview

Ask maintainers who already review GitHub Actions changes, rather than friends who will star anything.

- What was the last workflow change you reviewed? What was hard to understand?
- Without guidance, can you find the trigger, dependencies, and requested access in this app?
- Did any output lead you to the wrong conclusion?
- What did your existing tools tell you more clearly?
- Would you use this again on your next review? Observe whether that happens; an enthusiastic answer alone is not evidence.

Do not ask for a star as the price of feedback. Record usage only with consent, and separate feedback from adoption. Publish only permissioned, accurate accounts of real use.
