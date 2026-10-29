import { createGhCommandRunner } from "./miku-scm-command-runner.mjs";
import { SHA, ancestor } from "./miku-scm-sync-state.mjs";
import { parseRepository, repositoryApiArgs } from "./miku-scm-repository.mjs";

export class MergeReadUnavailable extends Error {}

const CONNECTION_CODES = new Set(["SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"]);

async function anonymousPull(ctx, repository, suffix, query) {
  const { host, owner, repository: name } = repository;
  const origin = host === "github.com" ? "https://api.github.com"
    : /^[^.]+\.ghe\.com$/.test(host) ? `https://api.${host}` : `https://${host}/api/v3`;
  const url = new URL(`${origin}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${suffix}`);
  if (query) url.search = new URLSearchParams(query).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await (ctx.dependencies.fetch ?? globalThis.fetch)(url, {
      method: "GET", redirect: "error", credentials: "omit", signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "miku-scm-sync-pull" },
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty response");
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 1024 * 1024) { await reader.cancel(); throw new Error("PR response exceeds 1 MiB"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    // Keep response bodies and arbitrary transport diagnostics out of the report.
    if (error instanceof SyntaxError || error.message === "PR response exceeds 1 MiB") {
      throw new Error(error instanceof SyntaxError ? "GitHub returned invalid PR JSON" : error.message);
    }
    const code = error.cause?.code ?? error.code;
    const reason = /^HTTP \d{3}$/.test(error.message) ? error.message
      : controller.signal.aborted ? "timed out" : CONNECTION_CODES.has(code) ? code : "request failed";
    throw new MergeReadUnavailable(`gh is not installed and anonymous GitHub PR verification is unavailable (${reason}).`);
  } finally { clearTimeout(timer); }
}

// This module has a read-only, fixed GitHub surface. It is never called for a
// normal work branch. A branch deleted after merge still has verifiable PR data.
export async function verifyMergedPull(ctx, op) {
  if (!op.original.branch.endsWith("-done")) throw new Error("Merge verification requires a done branch");
  const repository = parseRepository(op.remote.identity);
  if (!repository?.host) throw new Error("Automatic done-branch transition requires a hosted repository with a compatible PR API");
  const { owner, full_name: fullName } = repository;
  const publishedBranch = op.original.branch.slice(0, -5);
  const gh = ctx.dependencies.gh ?? createGhCommandRunner();
  let anonymous = false;
  const get = async (suffix, query) => {
    if (anonymous) return anonymousPull(ctx, repository, suffix, query);
    const fields = Object.entries(query ?? {}).flatMap(([key, value]) => ["-f", `${key}=${value}`]);
    const args = repositoryApiArgs(repository, suffix, ...fields);
    const r = gh(ctx.root, args, { allowFailure: true, timeout: 15_000 });
    if (!r.ok && r.error?.code === "ENOENT") {
      anonymous = true;
      ctx.warnings.push("GitHub CLI (gh) is not installed; verifying the PR with anonymous HTTPS reads.");
      return anonymousPull(ctx, repository, suffix, query);
    }
    if (!r.ok) throw new MergeReadUnavailable("GitHub PR verification failed or timed out; no merge was confirmed");
    try { return JSON.parse(r.stdout); } catch { throw new Error("GitHub returned invalid PR JSON"); }
  };
  const same = (pull) => pull?.head?.ref === publishedBranch
    && pull.head.sha === op.original.head && pull.head.repo?.full_name?.toLowerCase() === fullName
    && pull.base?.ref === op.base.name && pull.base.repo?.full_name?.toLowerCase() === fullName;
  const pulls = await get("pulls", { state: "all", head: `${owner}:${publishedBranch}`, base: op.base.name, per_page: "100" });
  if (!Array.isArray(pulls) || pulls.length >= 100) throw new Error("GitHub PR lookup is incomplete or exceeds its bounded result limit");
  const candidates = pulls.filter(same);
  if (candidates.length !== 1 || !Number.isSafeInteger(candidates[0].number) || candidates[0].number < 1) throw new Error("Exactly one matching PR head, repository and base is required");
  const pull = await get(`pulls/${candidates[0].number}`);
  if (!same(pull) || pull.number !== candidates[0].number || pull.merged !== true || pull.state !== "closed"
    || typeof pull.merged_at !== "string" || !Number.isFinite(Date.parse(pull.merged_at)) || !SHA.test(pull.merge_commit_sha ?? "")) {
    throw new Error("The exact PR has not been verified as merged");
  }
  if (!ancestor(ctx, pull.merge_commit_sha, op.base_sha)) throw new Error("The fetched base does not yet contain the verified PR merge result");
  return { number: pull.number, repository: fullName, branch: publishedBranch, head: pull.head.sha, base: pull.base.ref, merge_commit: pull.merge_commit_sha, merged_at: pull.merged_at };
}
