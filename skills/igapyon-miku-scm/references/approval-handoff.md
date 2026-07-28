# Approval Handoff

Issue mutation preflights save one immutable approval handoff under
`workplace/miku-scm/handoffs/`. The handoff fixes the preflight and apply
workflow IDs, reviewed apply arguments, workflow contract digest, reviewed
summary, and relevant Issue or draft digests.

After the human reviews the complete preflight and explicitly replies
`miku-scm approve` (or the legacy `miku-scm 承認` input), invoke:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.handoff.apply --apply
```

The fixed workflow accepts no workflow ID, command fragment, handoff ID, or
apply argument from the Agent. It requires exactly one pending Issue handoff
in the current repository. Zero pending handoffs stop safely. Multiple pending
handoffs also stop so the Agent cannot choose one implicitly.

The helper validates the record digest, immutable-content digest, workflow
pair, apply workflow allowlist, `--apply` gate, and reviewed workflow contract
digest before passing the unchanged argument array to the registered apply
workflow. The apply workflow remains authoritative for conflict detection,
attempt records, mutation non-retry, and postcondition verification.

Successful apply changes the handoff state to `applied`. A known safe stop
changes it to `not-applied`; an uncertain mutation changes it to `unresolved`.
The workflow never automatically retries either state.
