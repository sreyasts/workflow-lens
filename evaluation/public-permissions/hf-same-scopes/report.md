# Workflow Lens change review

Selected static differences, not a complete YAML diff or security certification. Neither workflow was executed.

## Selected field changes

| Scope | Field | Before | After |
| --- | --- | --- | --- |
| Workflow | workflow permissions | contents: write; id-token: write; packages: write | no token scopes requested |
| Job: version&#95;and&#95;release | permissions | inherited workflow default; contents: write; id-token: write; packages: write | job override; contents: write; id-token: write; packages: write |

## Newly matching review hints

None.

## No longer matching review hints

None.

## Limits

- Only the listed analyzer fields are compared. Scripts, action inputs, trigger filters, matrices, environments, containers, and other YAML changes may be omitted; no listed differences does not mean equivalent behavior or safety.
- Permissions are requested scopes, not effective runtime access. Repository defaults, event restrictions, organization policies, and external actions are not resolved.
- Job IDs identify jobs; renaming an ID appears as a removed and added job. Conditions are compared as text, not evaluated. Action references retain their order and duplicates; action behavior is not inspected.
- Hint differences match rule, severity, job, detail, and advice as a multiset, ignoring line and step positions. Identical hints in different steps cannot be distinguished; a disappearing hint does not prove a security issue was fixed.
- Requested permissions are shown. Event restrictions, organization policies, environments, and external action behavior are not resolved.

Generated locally with [Workflow Lens](https://sreyasts.github.io/workflow-lens/).
