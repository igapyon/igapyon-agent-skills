# Runtime rules: Issue writes

For a requested Issue write, finish every requested preflight, select only the
handoff IDs those preflights returned, and run the review workflow. Display the
complete review and wait for a separate current user message exactly equal to
`approve` or `miku-scm approve`, or a documented exact selector. Bind approval
to the current review's ordered IDs, immutable digests, repository and contract.
Then run the matching single or batch handoff apply once.

A request, preflight, pending list, quoted approval, `はい`, `OK`, or prose
containing `approve` is not approval. Changed payload/order/contract requires a
new review. Never select a global pending handoff or automatically retry an
unknown remote outcome. See `approval-handoff.md` for selector syntax and
recovery.
