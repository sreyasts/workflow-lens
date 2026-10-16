# Release policy

Only the latest stable versioned release is supported. The npm CLI package requires Node.js 22.18.0 or later; the current CI matrix checks 22.18.0 and 24. The project does not promise maintenance for older releases.

## Release checklist

1. Prepare a pull request with the package and lockfile version, matching changelog entry, corrected README/package contents, and any support-policy changes.
2. Require hosted CI to pass, including tests, build, package-content verification, actionlint, and zizmor. Review all findings before merging.
3. Confirm the npm package's Trusted Publisher is configured for GitHub user `sreyasts`, repository `workflow-lens`, and `.github/workflows/release.yml`, with direct publishing enabled. The release job uses npm OIDC, checks for npm CLI 11.5.1 or later, and has no long-lived npm token fallback.
4. After the PR is merged and required hosted checks pass, tag that exact commit with `vMAJOR.MINOR.PATCH`, matching `package.json` and the changelog heading.
5. Confirm the release workflow verified the package and published npm contents. The workflow compares registry integrity before treating an existing version as a retry; a mismatch fails closed.
6. Move the convenience `v0` action alias only after the immutable versioned tag exists. Production users should pin a verified full commit SHA.

npm versions are immutable. Never move an existing semver tag or attempt to replace a published package version; make a new patch release for corrected package contents. GitHub Action semver tags can be moved, so treat only full commit SHAs as immutable references.

The npm Trusted Publisher setup is managed in npm package settings and is not verifiable from this repository. Do not create a release tag until that configuration is present and the hosted CI run is green.
