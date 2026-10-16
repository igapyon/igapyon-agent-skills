# GitHub CLI And Network Prohibition

`igapyon-github-writer` is a local-only writing and Git workflow. It must never
invoke the GitHub CLI command `gh`, directly or indirectly.

## Fixed Boundary

- Do not invoke `gh` from the Agent, the Node runner, a helper, a shell wrapper,
  a package script, or a test fixture.
- Do not add arbitrary command pass-through, shell evaluation, aliases, or
  caller-selected executables.
- Do not access GitHub through REST, GraphQL, browser automation, `curl`, or
  another network substitute from this skill.
- Do not fetch, pull, push, publish, create, update, merge, or close remote
  GitHub resources.
- A user's remote-operation request does not authorize extending this skill's
  command surface. Report that the requested operation is unsupported here.

The fixed workflow manifest must declare `network_access: none`,
`remote_mutation: false`, and its complete executable allowlist. Runtime tests
must reject any `gh` process target and any unreviewed executable.

Local `git` is allowed only through fixed argument arrays with `shell:false`.
The existing apply workflows may create a local backup branch and rebuild local
commits after their sealed-plan approval gates. They do not contact a remote.
