# Workflow Lens change review

Selected static differences, not a complete YAML diff or security certification. Neither workflow was executed.

## Selected field changes

| Scope | Field | Before | After |
| --- | --- | --- | --- |
| Job: mkdocs | permissions | inherited workflow default; no token scopes requested | job override; contents: read; id-token: write |
| Job: mkdocs | secrets | ASTRAL&#95;DOCS&#95;PAT | RELEASES&#95;STS&#95;API&#95;URL |
| Job: mkdocs | actions | actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1; actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97; astral-sh/setup-uv@20cfd1bf945f4377ade1205e4dbc17946fc9a30d | actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1; actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97; astral-sh/setup-uv@20cfd1bf945f4377ade1205e4dbc17946fc9a30d; open-security-tools/ost-simple-sts@bda64bffc5722085512dc618ab85f588b6c49b96; actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 |
| Job: mkdocs | steps | 12 | 13 |

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
