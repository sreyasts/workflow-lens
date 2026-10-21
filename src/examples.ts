export const examples = {
  risky: `name: Community PR checks
on:
  pull_request_target:
    types: [opened, synchronize]
permissions: write-all
jobs:
  test:
    name: Test contribution
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - name: Log contribution title
        run: echo "\${{ github.event.pull_request.title }}"
      - run: npm ci && npm test
  publish:
    name: Publish preview
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      deployments: write
    steps:
      - name: Deploy preview
        env:
          DEPLOY_TOKEN: \${{ secrets.PREVIEW_TOKEN }}
        run: echo "Replace with your deployment command"
`,
  minimal: `name: Minimal CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Run project checks here"
  report:
    needs: test
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - run: echo "Checks complete"
`,
  reusable: `name: Release pipeline
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Build package"
  release:
    needs: build
    uses: example/automation/.github/workflows/release.yml@main
    permissions:
      contents: write
      id-token: write
    secrets: inherit
`
};

// A synthetic change-review exercise, not evidence of an external review.
export const comparisonExample = {
  before: examples.minimal,
  after: examples.minimal.replace('    permissions: {}', '    permissions:\n      contents: write\n      id-token: write'),
};
