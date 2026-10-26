import { createGhCommandRunner } from "./miku-scm-command-runner.mjs";
import { SHA, ancestor } from "./miku-scm-sync-state.mjs";

// This module has a read-only, fixed GitHub surface. It is never called for a
// normal work branch. A branch deleted after merge still has verifiable PR data.
export async function verifyMergedPull(ctx, op) {
  if (!op.original.branch.endsWith("-done")) throw new Error("Merge verification requires a done branch");
  const match = op.remote.identity.match(/^github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) throw new Error("Automatic done-branch transition requires a GitHub remote");
  const [, owner, repository] = match;
  const fullName = `${owner}/${repository}`;
  const publishedBranch = op.original.branch.slice(0, -5);
  const gh = ctx.dependencies.gh ?? createGhCommandRunner();
  const get = (args) => {
    const r = gh(ctx.root, args, { allowFailure: true, timeout: 15_000 });
    if (!r.ok) throw new Error("GitHub PR verification failed or timed out; no merge was confirmed");
    try { return JSON.parse(r.stdout); } catch { throw new Error("GitHub returned invalid PR JSON"); }
  };
  const same = (pull) => pull?.head?.ref === publishedBranch
    && pull.head.sha === op.original.head && pull.head.repo?.full_name?.toLowerCase() === fullName
    && pull.base?.ref === op.base.name && pull.base.repo?.full_name?.toLowerCase() === fullName;
  const pulls = get(["api", "--method", "GET", `repos/${fullName}/pulls`, "-f", "state=all", "-f", `head=${owner}:${publishedBranch}`, "-f", `base=${op.base.name}`, "-f", "per_page=100"]);
  if (!Array.isArray(pulls) || pulls.length >= 100) throw new Error("GitHub PR lookup is incomplete or exceeds its bounded result limit");
  const candidates = pulls.filter(same);
  if (candidates.length !== 1 || !Number.isSafeInteger(candidates[0].number) || candidates[0].number < 1) throw new Error("Exactly one matching PR head, repository and base is required");
  const pull = get(["api", "--method", "GET", `repos/${fullName}/pulls/${candidates[0].number}`]);
  if (!same(pull) || pull.number !== candidates[0].number || pull.merged !== true || pull.state !== "closed"
    || typeof pull.merged_at !== "string" || !Number.isFinite(Date.parse(pull.merged_at)) || !SHA.test(pull.merge_commit_sha ?? "")) {
    throw new Error("The exact PR has not been verified as merged");
  }
  if (!ancestor(ctx, pull.merge_commit_sha, op.base_sha)) throw new Error("The fetched base does not yet contain the verified PR merge result");
  return { number: pull.number, repository: fullName, branch: publishedBranch, head: pull.head.sha, base: pull.base.ref, merge_commit: pull.merge_commit_sha, merged_at: pull.merged_at };
}
