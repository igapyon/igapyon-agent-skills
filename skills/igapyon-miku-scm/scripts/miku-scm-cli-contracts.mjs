const option = (flag, value, description, extra = {}) => {
  const normalized = {
    flag,
    ...(value ? { value } : {}),
    required: false,
    repeatable: false,
    ...extra,
    description,
  };
  if (Array.isArray(normalized.choices)) {
    normalized.choices = Object.freeze([...normalized.choices]);
  }
  return Object.freeze(normalized);
};

const repoPath = option(
  "--repo",
  "<path>",
  "Target local repository.",
  { default: "current directory" },
);
const repository = option(
  "--repo",
  "<owner/repo>",
  "Target GitHub repository in exact owner/repository form.",
  { required: true },
);
const root = option(
  "--root",
  "<path>",
  "Local repository root used for operational files.",
  { default: "current directory" },
);
const issue = option(
  "--issue",
  "<positive-integer>",
  "Exact GitHub Issue number.",
  { required: true },
);
const draft = option(
  "--draft",
  "<repository-relative-path>",
  "Reviewed Markdown draft under the workflow-specific workplace directory.",
  { required: true },
);
const contractDigest = option(
  "--expected-contract-pair-sha256",
  "<sha256>",
  "Reviewed workflow contract pair digest returned by preflight.",
  { required: true },
);
const apply = option(
  "--apply",
  "",
  "Explicitly authorize the apply workflow after human review.",
  { required: true },
);
const handoffSelector = option(
  "--handoff",
  "<handoff-selector>",
  "Exact full handoff ID or a unique listed 12-character suffix, in reviewed order.",
);
const reviewSha = option(
  "--expected-review-sha256",
  "<sha256>",
  "Review binding digest returned by github.issue.handoff.review.",
  { required: true },
);
const approvalCommand = option(
  "--approval-command",
  "<approve-command>",
  "The exact current human approval command received after the full review was displayed.",
  { required_when: "--resume is absent", required_group: "approval or resume" },
);
const resume = option(
  "--resume",
  "",
  "Resume only from the stored approval receipt and known-safe prior attempt state.",
  { required_group: "approval or resume" },
);
const addLabel = option(
  "--add-label",
  "<existing-label>",
  "Existing label to add.",
  { repeatable: true },
);
const removeLabel = option(
  "--remove-label",
  "<existing-label>",
  "Existing label to remove.",
  { repeatable: true },
);

const issueCreateCommon = [
  repository,
  draft,
  option("--label", "<existing-label>", "Existing label to assign.", {
    repeatable: true,
    maximum_occurrences: 20,
  }),
  option("--parent", "<positive-integer>", "Optional parent Issue number."),
  root,
];

const issueCreateApply = [
  ...issueCreateCommon,
  option(
    "--expected-draft-sha256",
    "<sha256>",
    "Reviewed draft digest returned by preflight.",
    { required: true },
  ),
  option(
    "--expected-labels-sha256",
    "<sha256>",
    "Reviewed exact-label selection digest returned by preflight.",
    { required: true },
  ),
  option(
    "--expected-parent-sha256",
    "<sha256>",
    "Reviewed parent snapshot digest.",
    { required_when: "--parent is present" },
  ),
  contractDigest,
  apply,
];

const issueUpdateCommon = [
  repository,
  issue,
  draft,
  addLabel,
  removeLabel,
  root,
];

const issueUpdateApply = [
  ...issueUpdateCommon,
  option("--expected-draft-sha256", "<sha256>", "Reviewed draft digest.", { required: true }),
  option("--expected-update-sha256", "<sha256>", "Reviewed complete update digest.", {
    required: true,
  }),
  option(
    "--expected-current-issue-sha256",
    "<sha256>",
    "Reviewed current Issue snapshot digest.",
    { required: true },
  ),
  option("--expected-updated-at", "<timestamp>", "Reviewed Issue updatedAt value.", {
    required: true,
  }),
  contractDigest,
  apply,
];

const issueCommentCommon = [repository, issue, draft, root];
const issueCommentApply = [
  ...issueCommentCommon,
  option("--expected-draft-sha256", "<sha256>", "Reviewed comment draft digest.", {
    required: true,
  }),
  option("--expected-issue-sha256", "<sha256>", "Reviewed current Issue snapshot digest.", {
    required: true,
  }),
  option("--expected-updated-at", "<timestamp>", "Reviewed Issue updatedAt value.", {
    required: true,
  }),
  contractDigest,
  apply,
];

const issueLabelCommon = [
  repository,
  issue,
  addLabel,
  removeLabel,
  root,
];
const issueLabelApply = [
  ...issueLabelCommon,
  option("--expected-operation-sha256", "<sha256>", "Reviewed label-operation digest.", {
    required: true,
  }),
  option(
    "--expected-current-labels-sha256",
    "<sha256>",
    "Reviewed current-label set digest.",
    { required: true },
  ),
  option("--expected-updated-at", "<timestamp>", "Reviewed Issue updatedAt value.", {
    required: true,
  }),
  contractDigest,
  apply,
];

const issueCloseCommon = [
  repository,
  issue,
  option(
    "--reason",
    "<completed|not planned|duplicate>",
    "Exact GitHub close reason.",
    { required: true, choices: ["completed", "not planned", "duplicate"] },
  ),
  option("--duplicate-of", "<positive-integer>", "Canonical Issue number.", {
    required_when: "--reason duplicate",
  }),
  root,
];
const issueCloseApply = [
  ...issueCloseCommon,
  option("--expected-operation-sha256", "<sha256>", "Reviewed close-operation digest.", {
    required: true,
  }),
  option(
    "--expected-current-body-sha256",
    "<sha256>",
    "Reviewed current Issue body digest.",
    { required: true },
  ),
  option(
    "--expected-comments-sha256",
    "<sha256>",
    "Reviewed exact Issue comment snapshot digest.",
    { required: true },
  ),
  option(
    "--expected-duplicate-sha256",
    "<sha256>",
    "Reviewed canonical duplicate Issue digest.",
    { required_when: "--reason duplicate" },
  ),
  option("--expected-updated-at", "<timestamp>", "Reviewed Issue updatedAt value.", {
    required: true,
  }),
  contractDigest,
  apply,
];

const versionCommon = [
  repoPath,
  option(
    "--version-file",
    "<repository-relative-path>",
    "Primary version file to inspect.",
    { repeatable: true, maximum_occurrences: 10 },
  ),
  option(
    "--coupled-version-file",
    "<repository-relative-path>",
    "Version file that must remain coupled to the primary version.",
    { repeatable: true, maximum_occurrences: 10 },
  ),
  option(
    "--policy",
    "<auto|miku-date-coupled|content-date|semver>",
    "Version policy.",
    {
      default: "auto",
      choices: ["auto", "miku-date-coupled", "content-date", "semver"],
    },
  ),
  option("--timezone", "<IANA-timezone>", "Timezone for a date-based policy."),
  option("--level", "<major|minor|patch>", "Increment level for Semantic Versioning.", {
    choices: ["major", "minor", "patch"],
  }),
];

function contract(summary, options, exampleArguments, extra = {}) {
  const {
    operational_artifacts: operationalArtifacts = [],
    notes = [],
    ...details
  } = extra;
  return Object.freeze({
    summary,
    options: Object.freeze(options),
    example_arguments: Object.freeze(exampleArguments),
    network_access: "none",
    authentication: "none",
    ...details,
    operational_artifacts: Object.freeze([...operationalArtifacts]),
    notes: Object.freeze([...notes]),
  });
}

export const WORKFLOW_CLI_CONTRACTS = Object.freeze({
  "repository.sync.pull": contract(
    "Fetch the shared base and preserve local work; verify a merged PR only on a done branch.",
    [repoPath, option("--remote", "<name>", "Selected Git remote.", { default: "origin" }), option("--base", "<branch>", "Shared base branch; inferred when omitted."),
      option("--resume", "<operation-id>", "Resume this same interrupted pull without a fresh fetch or stash."),
      option("--abort", "<operation-id>", "Abort this same rebase and restore its retained carryover."),
      option("--resolved-carryover", "", "With --resume, explicitly confirm every retained carryover path was reviewed and resolved."),
      option("--resolved-next-work", "", "With --resume, explicitly confirm the saved next branch and interrupted checkout/hook were reviewed and resolved."),
      option("--empty", "<keep|drop>", "Explicit treatment of an empty stopped replay commit, only with --resume.", { choices: ["keep", "drop"] }), apply],
    ["--apply"],
    { network_access: "Git fetch; fixed GitHub PR reads only for -done", authentication: "existing Git and gh authentication", operational_artifacts: ["workplace/miku-scm/sync"], notes: ["Git 2.45+; no remote writes. Branch-base provenance is required for divergent replay."] },
  ),
  "repository.sync.push.prepare": contract(
    "Commit dirty work once and prepare immutable PR evidence for sync push.",
    [repoPath, option("--remote", "<name>", "Selected Git remote.", { default: "origin" }), option("--base", "<branch>", "Shared base branch."), option("--message", "<commit-message>", "Concise ordinary commit title; existing deterministic fallback applies when omitted."),
      option("--resume", "<operation-id>", "Return the same prepared evidence without committing again."), option("--cancel", "<operation-id>", "Revoke an unapplied prepared push while retaining all work."), apply],
    ["--message", "Update work", "--apply"],
    { network_access: "Git fetch and remote branch reads", authentication: "existing Git authentication", operational_artifacts: ["workplace/miku-scm/sync"], notes: ["Prepared evidence needs one Agent-authored PR draft before apply. No automatic sync pull or version increment."] },
  ),
  "repository.sync.push.apply": contract(
    "Consume the exact sync push plan and draft, then recommit and publish once.",
    [repoPath, option("--operation", "<operation-id>", "Exact prepared operation ID.", { required: true }), option("--expected-plan-sha256", "<sha256>", "Exact prepare result plan digest.", { required: true }), option("--pr-draft", "<repository-relative-path>", "Exact suggested PR draft path.", { required: true }), option("--expected-draft-sha256", "<sha256>", "SHA-256 of the saved draft bytes.", { required: true }), apply],
    ["--operation", "<operation-id>", "--expected-plan-sha256", "<sha256>", "--pr-draft", "workplace/miku-scm/pr-drafts/<draft>.md", "--expected-draft-sha256", "<sha256>", "--apply"],
    { network_access: "Git fetch, branch push and verification", authentication: "existing Git authentication", operational_artifacts: ["workplace/miku-scm/sync", "workplace/miku-scm/ok-push"], notes: ["macOS/Windows only. Creates no PR, merge, tag or Release. An unresolved push must never be resent automatically."] },
  ),
  "repository.status": contract(
    "Inspect local branch, worktree, worktrees, and selected version files.",
    [
      repoPath,
      option(
        "--version-file",
        "<repository-relative-path>",
        "Version file to inspect.",
        { repeatable: true, maximum_occurrences: 10, default: "pom.xml" },
      ),
    ],
    ["--repo", "."],
  ),
  "github.issue.read": contract(
    "Read an Issue, list Issues, or list labels through fixed GitHub CLI reads.",
    [
      repository,
      option("--list", "", "List Issues.", {
        required_group: "exactly one of --list, --issue, or --labels",
      }),
      option("--state", "<open|closed|all>", "Issue state used only with --list.", {
        default: "open",
        choices: ["open", "closed", "all"],
      }),
      option("--issue", "<positive-integer>", "Read one Issue and its comments.", {
        required_group: "exactly one of --list, --issue, or --labels",
      }),
      option("--labels", "", "List repository labels.", {
        required_group: "exactly one of --list, --issue, or --labels",
      }),
    ],
    ["--repo", "owner/repository", "--issue", "123"],
    { network_access: "GitHub read", authentication: "existing gh authentication" },
  ),
  "github.read.batch": contract(
    "Read and cache a bounded batch of GitHub Issue or label queries.",
    [
      repository,
      option(
        "--query",
        "<labels|issue:number|issues:open|issues:closed|issues:all>",
        "One fixed GitHub read query.",
        { required: true, repeatable: true, minimum_occurrences: 1, maximum_occurrences: 20 },
      ),
      option("--refresh", "", "Bypass a fresh cache entry."),
      root,
      option("--ttl-ms", "<0..86400000>", "Fresh-cache lifetime in milliseconds.", {
        default: 600000,
      }),
    ],
    ["--repo", "owner/repository", "--query", "labels", "--query", "issues:open"],
    {
      network_access: "GitHub read on cache miss or --refresh",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/github-readonly-cache"],
    },
  ),
  "github.issue.create.preflight": contract(
    "Validate a new Issue draft, labels, and optional parent without creating the Issue.",
    issueCreateCommon,
    ["--repo", "owner/repository", "--draft", "workplace/miku-scm/new-issues/issue-new-YYYYMMDDHHMM.md"],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["Preflight creates an immutable handoff. Display its complete review and wait for exact approve before the handoff apply workflow."],
    },
  ),
  "github.issue.create.apply": contract(
    "Create exactly one reviewed GitHub Issue and verify the result.",
    issueCreateApply,
    [
      "--repo", "owner/repository",
      "--draft", "workplace/miku-scm/new-issues/issue-new-YYYYMMDDHHMM.md",
      "--expected-draft-sha256", "<reviewed-sha256>",
      "--expected-labels-sha256", "<reviewed-sha256>",
      "--expected-contract-pair-sha256", "<reviewed-sha256>",
      "--apply",
    ],
    {
      network_access: "GitHub read and one Issue create mutation",
      authentication: "existing gh authentication",
      operational_artifacts: [
        "workplace/miku-scm/issue-attempts",
        "workplace/miku-scm/created-issues",
      ],
      notes: ["Internal helper contract only; the runner blocks direct calls. Apply through the reviewed Issue handoff."],
    },
  ),
  "github.issue.update.preflight": contract(
    "Validate a reviewed Issue title, body, and existing-label update.",
    issueUpdateCommon,
    [
      "--repo", "owner/repository", "--issue", "123",
      "--draft", "workplace/miku-scm/issue-updates/issue-123-update-YYYYMMDDHHMM.md",
    ],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
    },
  ),
  "github.issue.update.apply": contract(
    "Apply and verify one reviewed Issue title, body, and label update.",
    issueUpdateApply,
    [
      "--repo", "owner/repository", "--issue", "123",
      "--draft", "workplace/miku-scm/issue-updates/issue-123-update-YYYYMMDDHHMM.md",
      "--expected-draft-sha256", "<reviewed-sha256>",
      "--expected-update-sha256", "<reviewed-sha256>",
      "--expected-current-issue-sha256", "<reviewed-sha256>",
      "--expected-updated-at", "<reviewed-timestamp>",
      "--expected-contract-pair-sha256", "<reviewed-sha256>",
      "--apply",
    ],
    {
      network_access: "GitHub read and one Issue edit mutation",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/issue-update-attempts"],
    },
  ),
  "github.issue.comment.preflight": contract(
    "Validate a reviewed Issue comment draft against the current Issue.",
    issueCommentCommon,
    [
      "--repo", "owner/repository", "--issue", "123",
      "--draft", "workplace/miku-scm/issue-comments/issue-123-comment-YYYYMMDDHHMM.md",
    ],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
    },
  ),
  "github.issue.comment.apply": contract(
    "Post and verify one reviewed Issue comment.",
    issueCommentApply,
    [
      "--repo", "owner/repository", "--issue", "123",
      "--draft", "workplace/miku-scm/issue-comments/issue-123-comment-YYYYMMDDHHMM.md",
      "--expected-draft-sha256", "<reviewed-sha256>",
      "--expected-issue-sha256", "<reviewed-sha256>",
      "--expected-updated-at", "<reviewed-timestamp>",
      "--expected-contract-pair-sha256", "<reviewed-sha256>",
      "--apply",
    ],
    {
      network_access: "GitHub read and one Issue comment mutation",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/issue-comment-attempts"],
    },
  ),
  "github.issue.label.preflight": contract(
    "Validate an existing-label add/remove operation against the current Issue.",
    issueLabelCommon,
    ["--repo", "owner/repository", "--issue", "123", "--add-label", "enhancement"],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["At least one --add-label or --remove-label is required. Preflight saves a handoff; review and exact approve are still required."],
    },
  ),
  "github.issue.label.apply": contract(
    "Apply and verify one reviewed Issue label operation.",
    issueLabelApply,
    [
      "--repo", "owner/repository", "--issue", "123", "--add-label", "enhancement",
      "--expected-operation-sha256", "<reviewed-sha256>",
      "--expected-current-labels-sha256", "<reviewed-sha256>",
      "--expected-updated-at", "<reviewed-timestamp>",
      "--expected-contract-pair-sha256", "<reviewed-sha256>",
      "--apply",
    ],
    {
      network_access: "GitHub read and one Issue label mutation",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/issue-label-attempts"],
      notes: ["Internal helper contract only; the runner blocks direct calls. Apply through the reviewed Issue handoff."],
    },
  ),
  "github.issue.close.preflight": contract(
    "Validate a reviewed Issue close reason and optional canonical duplicate.",
    issueCloseCommon,
    ["--repo", "owner/repository", "--issue", "123", "--reason", "completed"],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
    },
  ),
  "github.issue.close.apply": contract(
    "Close and verify one reviewed Issue.",
    issueCloseApply,
    [
      "--repo", "owner/repository", "--issue", "123", "--reason", "completed",
      "--expected-operation-sha256", "<reviewed-sha256>",
      "--expected-current-body-sha256", "<reviewed-sha256>",
      "--expected-comments-sha256", "<reviewed-sha256>",
      "--expected-updated-at", "<reviewed-timestamp>",
      "--expected-contract-pair-sha256", "<reviewed-sha256>",
      "--apply",
    ],
    {
      network_access: "GitHub read and one Issue close mutation",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/issue-close-attempts"],
      notes: ["Internal helper contract only; the runner blocks direct calls. Apply through the reviewed Issue handoff."],
    },
  ),
  "github.issue.handoff.list": contract(
    "List pending reviewed Issue handoffs without exposing apply arguments.",
    [
      option("--root", "<path>", "Repository root containing approval handoffs.", {
        default: "current directory",
      }),
    ],
    [],
    {
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["Returns pending summaries and attention-needed records. The list is not a full review or approval."],
    },
  ),
  "github.issue.handoff.review": contract(
    "Return the complete ordered Issue operation review and a digest bound to the repository, records, and current approval contracts.",
    [
      option("--root", "<path>", "Repository root containing the approval handoffs.", { default: "current directory" }),
      option("--handoff", "<handoff-selector>", "Explicit full handoff ID or unique listed suffix in the intended order.", {
        required: true,
        repeatable: true,
        minimum_occurrences: 1,
        maximum_occurrences: 20,
      }),
    ],
    ["--handoff", "<reviewed-handoff-id>"],
    {
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["Displays full operation context, text, and metadata. Review is READONLY and never applies or consumes an attempt."],
    },
  ),
  "github.issue.handoff.apply": contract(
    "Apply exactly one reviewed Issue handoff after an exact approve command and matching review digest.",
    [
      option("--root", "<path>", "Repository root containing the pending handoff.", {
        default: "current directory",
      }),
      { ...handoffSelector, required: true },
      reviewSha,
      approvalCommand,
      resume,
      apply,
    ],
    ["--handoff", "<reviewed-handoff-id>", "--expected-review-sha256", "<review-sha256>", "--approval-command", "approve", "--apply"],
    {
      network_access: "Depends on the reviewed Issue apply workflow",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["Requires an explicit reviewed handoff ID, the exact review digest, and either the actual approve command or --resume. Global pending selection is disabled."],
    },
  ),
  "github.issue.handoff.batch.apply": contract(
    "Apply an explicit ordered batch of reviewed Issue handoffs after one exact approve command and matching review digest.",
    [
      option("--root", "<path>", "Repository root containing pending handoffs.", {
        default: "current directory",
      }),
      option("--handoff", "<handoff-selector>", "Explicit full handoff ID or unique listed suffix in reviewed order.", {
        required: true,
        repeatable: true,
        minimum_occurrences: 2,
        maximum_occurrences: 20,
      }),
      reviewSha,
      approvalCommand,
      resume,
      apply,
    ],
    ["--handoff", "<first-id>", "--handoff", "<second-id>", "--expected-review-sha256", "<review-sha256>", "--approval-command", "approve", "--apply"],
    {
      network_access: "Depends on each reviewed Issue apply workflow",
      authentication: "existing gh authentication",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: [
        "Validates the approval grammar, review digest, and every selected record before the first apply.",
        "Preserves the supplied order and stops before later handoffs after any non-applied result.",
      ],
    },
  ),
  "github.issue.handoff.dismiss": contract(
    "Mark one explicitly selected pending Issue handoff as not-applied.",
    [
      option("--root", "<path>", "Repository root containing the pending handoff.", {
        default: "current directory",
      }),
      option("--handoff", "<handoff-selector>", "Human-supplied full pending ID, or a listed suffix that resolves uniquely.", {
        required: true,
      }),
      apply,
    ],
    ["--handoff", "<handoff-selector>", "--apply"],
    {
      network_access: "none",
      operational_artifacts: ["workplace/miku-scm/handoffs"],
      notes: ["Changes only the selected pending v2 handoff to dismissed; this performs no GitHub mutation."],
    },
  ),
  "repository.maintenance.diagnose": contract(
    "Diagnose merged, done, and backup branches without deleting refs.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
    ],
    ["--repo", "."],
    {
      network_access: "GitHub and Git remote reads",
      authentication: "existing gh and Git authentication",
    },
  ),
  "repository.maintenance.plan": contract(
    "Create a reviewed repository-maintenance deletion plan.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option("--save-plan", "", "Persist the reviewed maintenance plan.", { required: true }),
    ],
    ["--repo", ".", "--save-plan"],
    {
      network_access: "GitHub and Git remote reads",
      authentication: "existing gh and Git authentication",
      operational_artifacts: ["workplace/miku-scm/maintenance/plans"],
    },
  ),
  "repository.maintenance.apply": contract(
    "Revalidate and delete exactly the local branches fixed by a reviewed plan.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option(
        "--apply-plan",
        "<workplace/miku-scm/maintenance/plans/*.json>",
        "Reviewed maintenance plan.",
        { required: true },
      ),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan file digest.", {
        required: true,
      }),
    ],
    [
      "--apply-plan", "workplace/miku-scm/maintenance/plans/<plan>.json",
      "--expected-plan-sha256", "<reviewed-sha256>",
    ],
    {
      network_access: "GitHub and Git remote reads before local deletion",
      authentication: "existing gh and Git authentication",
      operational_artifacts: ["workplace/miku-scm/maintenance"],
    },
  ),
  "repository.post-merge.next-work": contract(
    "Refresh the merged base and create the next local work branch.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option("--base", "<branch>", "Base branch; inferred from the current done branch or remote HEAD when omitted."),
      option("--confirmed-merged", "", "Confirm that the PR was merged.", { required: true }),
      apply,
    ],
    ["--confirmed-merged", "--apply"],
    {
      network_access: "Git fetch and remote tag read",
      authentication: "existing Git authentication",
      notes: ["Creates and switches to one local branch. This is an apply workflow despite its ID."],
    },
  ),
  "work.commit": contract(
    "Stage every non-ignored current change, run fixed consistency checks, and create one local commit.",
    [
      repoPath,
      option("--message", "<commit-message>", "Optional reviewed commit message; a deterministic fallback is used when omitted."),
      apply,
    ],
    ["--message", "Update work", "--apply"],
    {
      operational_artifacts: ["workplace/miku-scm/runs"],
      notes: [
        "Stages all current non-ignored changes; it never pushes, tags, or creates a Release.",
        "Stops before staging conflicts, frozen -done branches, sensitive-path candidates, and coupled-version mismatches.",
      ],
    },
  ),
  "pr.publish.preflight": contract(
    "Resolve an exact reviewed push plan for the current branch.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option("--expected-head", "<full-object-id>", "Reviewed local HEAD object ID.", {
        required: true,
      }),
      option("--save-plan", "", "Persist the publication plan.", { required: true }),
    ],
    ["--expected-head", "<reviewed-full-object-id>", "--save-plan"],
    {
      network_access: "Git remote read",
      authentication: "existing Git authentication",
      operational_artifacts: ["workplace/miku-scm/ok-push"],
    },
  ),
  "pr.publish.apply": contract(
    "Push exactly the branch and HEAD fixed by a reviewed publication plan.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option(
        "--apply-plan",
        "<workplace/miku-scm/ok-push/*.json>",
        "Reviewed publication plan.",
        { required: true },
      ),
      option("--expected-plan-sha256", "<sha256>", "Reviewed plan file digest.", {
        required: true,
      }),
    ],
    [
      "--apply-plan", "workplace/miku-scm/ok-push/<plan>.json",
      "--expected-plan-sha256", "<reviewed-sha256>",
    ],
    {
      network_access: "Git push with an exact lease or new-branch assertion",
      authentication: "existing Git authentication",
      operational_artifacts: ["workplace/miku-scm/ok-push"],
    },
  ),
  "pr.recommit.preflight": contract(
    "Collect PR draft, branch, base, backup, and commit evidence without rewriting commits.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote namespace used for automatic base resolution.", { default: "origin" }),
      option("--base", "<git-ref>", "Explicit base ref; otherwise resolve a safe candidate."),
      option("--pr-draft", "<repository-relative-path>", "Reviewed PR draft file."),
    ],
    ["--pr-draft", "workplace/miku-scm/pr-drafts/<draft>.md"],
  ),
  "pr.recommit.apply": contract(
    "Create a backup branch, soft-reset to the reviewed base, and recommit the reviewed draft.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote namespace used for automatic base resolution.", { default: "origin" }),
      option("--base", "<git-ref>", "Reviewed base ref.", { required: true }),
      option("--pr-draft", "<repository-relative-path>", "Reviewed PR draft file.", {
        required: true,
      }),
      option("--allow-dirty", "", "Allow the narrowly documented dirty-worktree exception."),
      apply,
    ],
    [
      "--remote", "origin",
      "--base", "origin/devel",
      "--pr-draft", "workplace/miku-scm/pr-drafts/<draft>.md",
      "--apply",
    ],
    {
      operational_artifacts: ["local backup branch and rewritten local commit"],
      notes: ["Never pushes or creates a Pull Request."],
    },
  ),
  "pr.recommit.push": contract(
    "Resolve the base and reviewed Pull Request text draft, then create a backup, recommit, and conditionally push in one fixed transition.",
    [
      repoPath,
      option("--remote", "<name>", "Git remote name.", { default: "origin" }),
      option("--base", "<git-ref>", "Optional base override; otherwise resolve the safe current-branch candidate."),
      option("--pr-draft", "<repository-relative-path>", "Optional reviewed PR draft override; otherwise resolve the latest branch-matching candidate."),
      apply,
    ],
    ["--apply"],
    {
      network_access: "Git remote read and one exact-lease or new-branch push",
      authentication: "existing Git authentication",
      operational_artifacts: ["local backup branch", "workplace/miku-scm/ok-push"],
      notes: [
        "The explicit draft recommit push request authorizes only this exact branch publication; it never creates a Pull Request, tag, or Release.",
        "No matching reviewed Pull Request text draft stops before backup creation; the runner never invents PR prose.",
        "Current apply support is macOS and native Windows; other platforms stop before backup creation.",
      ],
    },
  ),
  "version.status": contract(
    "Inspect current version sources, policy candidates, and alignment.",
    versionCommon,
    ["--repo", ".", "--version-file", "pom.xml"],
  ),
  "version.increment.validate": contract(
    "Validate and propose the next version without editing files.",
    [
      ...versionCommon.map((entry) => (
        entry.flag === "--policy" ? Object.freeze({ ...entry, required: true, default: undefined }) : entry
      )),
      option(
        "--validate-increment",
        "",
        "Compute and validate the next version proposal.",
        { required: true },
      ),
    ],
    [
      "--version-file", "pom.xml",
      "--policy", "miku-date-coupled",
      "--timezone", "Asia/Tokyo",
      "--validate-increment",
    ],
    {
      notes: [
        "--timezone is required for date policies; --level is required for Semantic Versioning.",
      ],
    },
  ),
  "writing.issue.prepare": contract(
    "Collect bounded repository and GitHub evidence for drafting Issue prose.",
    [
      repoPath,
      option("--github-repo", "<owner/repo>", "Target GitHub repository.", { required: true }),
      option("--issue", "<positive-integer>", "Existing Issue to include as evidence."),
    ],
    ["--github-repo", "owner/repository"],
    {
      network_access: "GitHub read",
      authentication: "existing gh authentication",
    },
  ),
  "writing.pr.prepare": contract(
    "Collect bounded repository evidence for drafting Pull Request prose; without --target, prefer the complete branch range when two or more commits are ahead of the resolved base.",
    [
      repoPath,
      option("--target", "<git-ref-or-range>", "Optional reviewed comparison target."),
    ],
    ["--repo", "."],
  ),
  "writing.release.prepare": contract(
    "Collect bounded repository evidence for drafting Release prose.",
    [
      repoPath,
      option("--target", "<git-ref-or-range>", "Reviewed Release comparison target.", {
        required: true,
      }),
    ],
    ["--target", "vPrevious..HEAD"],
  ),
  "writing.about.prepare": contract(
    "Collect bounded repository evidence for drafting GitHub About text.",
    [repoPath],
    ["--repo", "."],
  ),
});

export function workflowCliContractById() {
  return new Map(Object.entries(WORKFLOW_CLI_CONTRACTS));
}
