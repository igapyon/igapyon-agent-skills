#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, open, readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { workflowContractById } from "./miku-scm-workflow-contract-lock.mjs";

const MAINTENANCE_APPLY_CONTRACT = workflowContractById().get("repository.maintenance.apply");
const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const REMOTE = /^[A-Za-z0-9._-]+$/;
const PLAN_PATH = /^workplace\/miku-scm\/maintenance\/plans\/[A-Za-z0-9._-]+\.json$/;
const BACKUP = /^backup\/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(?:-(\d+))?$/;
const KEEP_BACKUPS = 3;
const MAX_BACKUP_AGE_HOURS = 168;
const GH_TIMEOUT_MS = 15_000;

function validBranchName(value) {
  return typeof value === "string"
    && /^[A-Za-z0-9._/-]+$/.test(value)
    && !value.startsWith("-")
    && !value.startsWith("/")
    && !value.endsWith("/")
    && !value.endsWith(".")
    && !value.includes("..")
    && !value.includes("//")
    && !value.includes("@{")
    && !value.endsWith(".lock");
}

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs [--repo <path>] [--remote <name>]
  node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs [--repo <path>] [--remote <name>] --save-plan
  node skills/igapyon-miku-scm/scripts/repository-maintenance.mjs [--repo <path>] \\
    --apply-plan workplace/miku-scm/maintenance/plans/<plan>.json \\
    --expected-plan-sha256 <reviewed-sha256>

Default mode diagnoses without changing refs. --save-plan writes reviewed
operational data only. --apply-plan revalidates and atomically deletes exactly
the branches fixed by the reviewed plan.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repo: cwd,
    remote: "origin",
    savePlan: false,
    applyPlan: "",
    expectedPlanSha256: "",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--remote") options.remote = argv[++index] ?? "";
    else if (arg === "--save-plan") options.savePlan = true;
    else if (arg === "--apply-plan") options.applyPlan = argv[++index] ?? "";
    else if (arg === "--expected-plan-sha256") options.expectedPlanSha256 = argv[++index] ?? "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!options.repo) throw new Error("--repo must not be empty");
  if (!REMOTE.test(options.remote)) throw new Error("--remote must be a Git remote name");
  if (options.applyPlan) {
    if (options.savePlan) throw new Error("--apply-plan cannot be combined with --save-plan");
    if (!PLAN_PATH.test(options.applyPlan)) throw new Error("--apply-plan must be a maintenance plan path");
    if (!/^[0-9a-f]{64}$/i.test(options.expectedPlanSha256)) {
      throw new Error("--apply-plan requires --expected-plan-sha256");
    }
  } else if (options.expectedPlanSha256) {
    throw new Error("--expected-plan-sha256 requires --apply-plan");
  }
  return options;
}

export function createGitRunner() {
  return (cwd, args, options = {}) => {
    const result = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      input: options.input,
      maxBuffer: 20 * 1024 * 1024,
    });
    const response = {
      ok: result.status === 0,
      status: result.status,
      stdout: (result.stdout || "").trimEnd(),
      stderr: (result.stderr || "").trimEnd(),
    };
    if (!response.ok && !options.allowFailure) {
      const detail = response.stderr || response.stdout;
      throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
    }
    return response;
  };
}

export function createGhRunner() {
  return (args) => {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      timeout: GH_TIMEOUT_MS,
      maxBuffer: 20 * 1024 * 1024,
    });
    return {
      ok: result.status === 0,
      status: result.status,
      signal: result.signal,
      timedOut: result.error?.code === "ETIMEDOUT",
      stdout: (result.stdout || "").trimEnd(),
      stderr: (result.stderr || "").trimEnd(),
    };
  };
}

function gitText(git, root, args, options) {
  return git(root, args, options).stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalGitHubRepository(remoteUrl) {
  let owner = "";
  let repository = "";
  const scp = remoteUrl.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (scp) {
    [, owner, repository] = scp;
  } else {
    try {
      const parsed = new URL(remoteUrl);
      if (parsed.hostname.toLowerCase() !== "github.com") return null;
      const parts = parsed.pathname.replace(/^\/+/, "").split("/");
      if (parts.length !== 2) return null;
      [owner, repository] = parts;
    } catch {
      return null;
    }
  }
  repository = repository.replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) return null;
  return { owner, repository, full_name: `${owner}/${repository}`, url: `https://github.com/${owner}/${repository}` };
}

function parseRefs(output) {
  return output.split("\n").filter(Boolean).map((line) => {
    const [name, object] = line.split("\0");
    if (!name || !SHA.test(object || "")) throw new Error("Malformed local branch record");
    return { name, ref: `refs/heads/${name}`, object: object.toLowerCase() };
  });
}

function parseWorktreeBranches(output) {
  return new Set(output.split("\n")
    .filter((line) => line.startsWith("branch refs/heads/"))
    .map((line) => line.slice("branch refs/heads/".length)));
}

export function parseBackupName(name) {
  const match = name.match(BACKUP);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, sequenceText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const sequence = sequenceText ? Number(sequenceText) : 1;
  if (sequence < 1 || (sequenceText && sequence === 1)) return null;
  const created = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (created.getFullYear() !== year || created.getMonth() !== month - 1
    || created.getDate() !== day || created.getHours() !== hour || created.getMinutes() !== minute) return null;
  return { created, created_at: created.toISOString(), sequence };
}

function provenanceKey(branch, object) {
  return `${branch}\0${object.toLowerCase()}`;
}

export async function loadPublicationProvenance(root) {
  const directory = path.join(root, "workplace", "miku-scm", "ok-push");
  let names;
  try {
    names = await readdir(directory);
  } catch {
    return new Map();
  }
  const matches = new Map();
  for (const name of names.filter((value) => value.endsWith(".json") && !value.endsWith(".attempt.json"))) {
    try {
      const plan = JSON.parse(await readFile(path.join(directory, name), "utf8"));
      const attempt = JSON.parse(await readFile(path.join(directory, `${name}.attempt.json`), "utf8"));
      if (attempt.status === "published" && typeof plan.done_branch === "string"
        && SHA.test(String(plan.reviewed_head || "")) && typeof plan.branch === "string"
        && validBranchName(plan.done_branch) && validBranchName(plan.branch)) {
        const key = provenanceKey(plan.done_branch, String(plan.reviewed_head));
        const entries = matches.get(key) ?? [];
        entries.push({ remote_branch: plan.branch, source: "published-plan", plan: name });
        matches.set(key, entries);
      }
    } catch {
      // Ignore incomplete, legacy, or unrelated operational records.
    }
  }
  const index = new Map();
  for (const [key, entries] of matches) {
    index.set(key, entries.length === 1 ? entries[0] : { ambiguous: true });
  }
  return index;
}

function ghJson(gh, args, label) {
  const result = gh(args);
  if (!result.ok) {
    if (result.timedOut) throw new Error(`${label} timed out after ${GH_TIMEOUT_MS}ms`);
    const detail = result.stderr || result.stdout;
    throw new Error(`${label} failed${detail ? `: ${detail}` : ""}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} returned malformed JSON`);
  }
}

function pullRequestsByHead(gh, repository, branch) {
  const data = ghJson(gh, [
    "api", "--method", "GET",
    `repos/${repository.owner}/${repository.repository}/pulls`,
    "-f", "state=all",
    "-f", `head=${repository.owner}:${branch}`,
    "-f", "per_page=100",
  ], "GitHub Pull Request head lookup");
  if (!Array.isArray(data)) throw new Error("GitHub Pull Request head lookup returned a non-array");
  return data;
}

function pullRequestByNumber(gh, repository, number) {
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error("Reviewed Pull Request number is invalid");
  const data = ghJson(gh, [
    "api", "--method", "GET",
    `repos/${repository.owner}/${repository.repository}/pulls/${number}`,
  ], "GitHub Pull Request exact lookup");
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new Error("GitHub Pull Request exact lookup returned malformed data");
  }
  return data;
}

function exactPullMatches(pulls, repository, branch, object) {
  const fullName = repository.full_name.toLowerCase();
  return pulls.filter((pull) => pull && pull.head
    && pull.head.ref === branch
    && String(pull.head.sha || "").toLowerCase() === object.toLowerCase()
    && String(pull.head.repo?.full_name || "").toLowerCase() === fullName);
}

function item(branch, classification, reason, extra = {}) {
  return {
    kind: branch.name.endsWith("-done") ? "done" : "backup",
    branch: branch.name,
    ref: branch.ref,
    object: branch.object,
    classification,
    reason,
    ...extra,
  };
}

async function classifyDone(branch, context) {
  if (branch.name === context.current) return item(branch, "retained", "current-branch");
  if (context.worktreeBranches.has(branch.name)) return item(branch, "retained", "checked-out-in-worktree");
  if (!context.github) return item(branch, "unresolved", "github-repository-unresolved");
  const provenance = context.provenanceIndex.get(provenanceKey(branch.name, branch.object)) ?? null;
  if (provenance?.ambiguous) return item(branch, "unresolved", "published-plan-provenance-ambiguous");
  const remoteBranch = provenance?.remote_branch ?? branch.name.slice(0, -"-done".length);
  if (!remoteBranch) return item(branch, "unresolved", "pushed-branch-unresolved");
  try {
    if (context.githubStop) throw context.githubStop;
    const reviewedNumber = context.plannedPullNumbers?.get(branch.name);
    const pulls = reviewedNumber
      ? [pullRequestByNumber(context.gh, context.github, reviewedNumber)]
      : pullRequestsByHead(context.gh, context.github, remoteBranch);
    if (!reviewedNumber && pulls.length >= 100) {
      return item(branch, "unresolved", "pull-request-head-result-limit", {
        remote_branch: remoteBranch,
        provenance: provenance?.source ?? "legacy-name",
        result_count: pulls.length,
      });
    }
    const matches = exactPullMatches(pulls, context.github, remoteBranch, branch.object);
    if (matches.length !== 1) {
      return item(branch, "unresolved", matches.length ? "multiple-exact-pull-requests" : "exact-pull-request-not-found",
        { remote_branch: remoteBranch, provenance: provenance?.source ?? "legacy-name" });
    }
    const pull = matches[0];
    const evidence = {
      remote_branch: remoteBranch,
      provenance: provenance?.source ?? "legacy-name",
      pull_request: {
        number: pull.number,
        url: pull.html_url,
        state: pull.state,
        merged_at: pull.merged_at ?? null,
        head_ref: pull.head.ref,
        head_sha: String(pull.head.sha).toLowerCase(),
      },
    };
    if (!pull.merged_at) return item(branch, "retained", "pull-request-not-merged", evidence);
    return item(branch, "delete-candidate", "pull-request-merged", evidence);
  } catch (error) {
    context.githubStop = error;
    return item(branch, "unresolved", "github-inspection-failed", {
      remote_branch: remoteBranch,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function otherContainingRefs(git, root, branch) {
  const output = gitText(git, root, [
    "for-each-ref", `--contains=${branch.object}`, "--format=%(refname)",
    "refs/heads", "refs/remotes", "refs/tags",
  ], { allowFailure: true });
  return output.split("\n").filter(Boolean).filter((ref) => ref !== branch.ref);
}

function classifyBackups(branches, context) {
  const valid = [];
  const invalid = [];
  for (const branch of branches) {
    const parsed = parseBackupName(branch.name);
    if (parsed) valid.push({ ...branch, ...parsed });
    else invalid.push(item(branch, "unresolved", "backup-name-unparseable"));
  }
  valid.sort((left, right) => right.created.getTime() - left.created.getTime() || right.sequence - left.sequence);
  const classified = valid.map((branch, index) => {
    const ageHours = (context.now.getTime() - branch.created.getTime()) / 3_600_000;
    const evidence = {
      created_at: branch.created_at,
      age_hours: Math.max(0, Math.floor(ageHours * 100) / 100),
      retention_rank: index + 1,
    };
    if (branch.name === context.current) return item(branch, "retained", "current-branch", evidence);
    if (context.worktreeBranches.has(branch.name)) return item(branch, "retained", "checked-out-in-worktree", evidence);
    if (index < KEEP_BACKUPS) return item(branch, "retained", "newest-three", evidence);
    if (ageHours <= MAX_BACKUP_AGE_HOURS) return item(branch, "retained", "within-168-hours", evidence);
    if (context.backupBranchFilter && !context.backupBranchFilter.has(branch.name)) {
      return item(branch, "delete-candidate", "outside-newest-three-and-older-than-168-hours", evidence);
    }
    return item(branch, "delete-candidate", "outside-newest-three-and-older-than-168-hours", {
      ...evidence,
      contained_by_other_refs: otherContainingRefs(context.git, context.root, branch),
    });
  });
  const all = [...classified, ...invalid];
  return context.backupBranchFilter
    ? all.filter((branch) => context.backupBranchFilter.has(branch.branch))
    : all;
}

function grouped(items) {
  return {
    delete_candidates: items.filter((value) => value.classification === "delete-candidate"),
    retained: items.filter((value) => value.classification === "retained"),
    unresolved: items.filter((value) => value.classification === "unresolved"),
  };
}

export async function diagnose(options, dependencies = {}) {
  const git = dependencies.git ?? createGitRunner();
  const gh = dependencies.gh ?? createGhRunner();
  const now = dependencies.now ? dependencies.now() : new Date();
  const root = gitText(git, options.repo, ["rev-parse", "--show-toplevel"]);
  const current = gitText(git, root, ["branch", "--show-current"]);
  const workingTree = gitText(git, root, ["status", "--porcelain"]);
  const refs = parseRefs(gitText(git, root, [
    "for-each-ref", "--format=%(refname:short)%00%(objectname)", "refs/heads",
  ]));
  const worktreeBranches = parseWorktreeBranches(gitText(git, root, ["worktree", "list", "--porcelain"]));
  const remoteUrl = gitText(git, root, ["remote", "get-url", options.remote], { allowFailure: true });
  const github = canonicalGitHubRepository(remoteUrl);
  const requestedDoneBranches = dependencies.doneBranchFilter;
  const doneRefs = refs.filter((value) => value.name.endsWith("-done")
    && (!requestedDoneBranches || requestedDoneBranches.has(value.name)));
  const loadProvenance = dependencies.loadProvenance ?? loadPublicationProvenance;
  const provenanceIndex = doneRefs.length ? await loadProvenance(root) : new Map();
  const context = {
    git, gh, root, current, worktreeBranches, now, github, provenanceIndex,
    plannedPullNumbers: dependencies.plannedPullNumbers,
    backupBranchFilter: dependencies.backupBranchFilter,
    githubStop: null,
  };
  const done = [];
  for (const branch of doneRefs) {
    done.push(await classifyDone(branch, context));
  }
  const backups = classifyBackups(refs.filter((value) => value.name.startsWith("backup/")), context);
  return {
    schema_version: 1,
    status: "diagnosed",
    repository: root,
    remote: options.remote,
    github_repository: github?.full_name ?? null,
    assessed_at: now.toISOString(),
    current_branch: current,
    working_tree: workingTree ? "dirty" : "clean",
    policy: { keep_newest_backups: KEEP_BACKUPS, max_backup_age_hours: MAX_BACKUP_AGE_HOURS },
    done: grouped(done),
    backups: grouped(backups),
    deletion_performed: false,
  };
}

function planDirectory(root) {
  return path.join(root, "workplace", "miku-scm", "maintenance", "plans");
}

function planCandidates(diagnosis) {
  return [...diagnosis.done.delete_candidates, ...diagnosis.backups.delete_candidates];
}

export async function saveMaintenancePlan(diagnosis, dependencies = {}) {
  const now = dependencies.now ? dependencies.now() : new Date();
  const plan = {
    schema_version: 1,
    workflow_contract: MAINTENANCE_APPLY_CONTRACT.contract_id,
    contract_version: MAINTENANCE_APPLY_CONTRACT.contract_version,
    contract_pair_sha256: MAINTENANCE_APPLY_CONTRACT.pair_sha256,
    repository: diagnosis.repository,
    remote: diagnosis.remote,
    created_at: now.toISOString(),
    policy: diagnosis.policy,
    candidates: planCandidates(diagnosis),
    diagnosis: { done: diagnosis.done, backups: diagnosis.backups },
  };
  const content = `${JSON.stringify(plan, null, 2)}\n`;
  const digest = sha256(content);
  const timestamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  const directory = planDirectory(diagnosis.repository);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `maintenance-${timestamp}-${digest.slice(0, 12)}.json`);
  await writeFile(file, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return {
    ...diagnosis,
    status: "plan-saved",
    plan_path: path.relative(diagnosis.repository, file),
    plan_sha256: digest,
    deletion_candidates: plan.candidates,
  };
}

async function loadPlan(options) {
  const root = await realpath(options.repo);
  const directory = await realpath(planDirectory(root));
  const file = path.resolve(root, options.applyPlan);
  if (!file.startsWith(`${directory}${path.sep}`)) throw new Error("Maintenance plan path escapes plan directory");
  const content = await readFile(file, "utf8");
  if (sha256(content) !== options.expectedPlanSha256.toLowerCase()) throw new Error("Maintenance plan SHA-256 changed");
  const plan = JSON.parse(content);
  if (plan?.schema_version !== 1 || plan.repository !== root || !REMOTE.test(plan.remote)
    || !Array.isArray(plan.candidates) || plan.candidates.some((candidate) => !SHA.test(candidate?.object || "")
      || !validBranchName(candidate?.branch) || candidate?.ref !== `refs/heads/${candidate.branch}`
      || !["done", "backup"].includes(candidate?.kind)
      || candidate?.classification !== "delete-candidate"
      || (candidate.kind === "done" && (!candidate.branch.endsWith("-done")
        || !Number.isSafeInteger(candidate.pull_request?.number) || candidate.pull_request.number <= 0))
      || (candidate.kind === "backup" && !candidate.branch.startsWith("backup/")))) {
    throw new Error("Malformed maintenance plan");
  }
  if (plan.workflow_contract !== MAINTENANCE_APPLY_CONTRACT.contract_id
    || plan.contract_version !== MAINTENANCE_APPLY_CONTRACT.contract_version
    || plan.contract_pair_sha256 !== MAINTENANCE_APPLY_CONTRACT.pair_sha256) {
    throw new Error("Maintenance plan workflow contract changed; run planning again");
  }
  return { root, file, plan };
}

function candidateKey(candidate) {
  return `${candidate.ref}\0${candidate.object.toLowerCase()}`;
}

async function writeAttempt(file, record, flag) {
  if (flag === "wx") {
    const handle = await open(file, "wx", 0o600);
    try { await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8"); }
    finally { await handle.close(); }
  } else {
    await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  }
}

export async function applyMaintenancePlan(options, dependencies = {}) {
  const loaded = await loadPlan(options);
  if (loaded.plan.candidates.length === 0) throw new Error("Maintenance plan has no deletion candidates");
  const attemptFile = `${loaded.file}.attempt.json`;
  try {
    await readFile(attemptFile, "utf8");
    throw new Error("This maintenance plan already has an attempt. Do not retry it.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const plannedDoneBranches = new Set(loaded.plan.candidates
    .filter((candidate) => candidate.kind === "done")
    .map((candidate) => candidate.branch));
  const plannedPullNumbers = new Map(loaded.plan.candidates
    .filter((candidate) => candidate.kind === "done")
    .map((candidate) => [candidate.branch, candidate.pull_request.number]));
  const plannedBackupBranches = new Set(loaded.plan.candidates
    .filter((candidate) => candidate.kind === "backup")
    .map((candidate) => candidate.branch));
  const diagnosis = await diagnose(
    { ...options, repo: loaded.root, remote: loaded.plan.remote },
    {
      ...dependencies,
      doneBranchFilter: plannedDoneBranches,
      plannedPullNumbers,
      backupBranchFilter: plannedBackupBranches,
    },
  );
  const current = new Map(planCandidates(diagnosis).map((candidate) => [candidateKey(candidate), candidate]));
  for (const candidate of loaded.plan.candidates) {
    const refreshed = current.get(candidateKey(candidate));
    if (!refreshed || (candidate.kind === "done"
      && refreshed.pull_request?.number !== candidate.pull_request?.number)) {
      throw new Error(`Planned candidate is no longer eligible: ${candidate.branch}`);
    }
  }
  const startedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
  const pending = {
    schema_version: 1,
    status: "pending",
    plan_sha256: options.expectedPlanSha256.toLowerCase(),
    started_at: startedAt,
    candidates: loaded.plan.candidates.map(({ branch, ref, object, kind }) => ({ branch, ref, object, kind })),
  };
  try {
    await writeAttempt(attemptFile, pending, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("This maintenance plan already has an attempt. Do not retry it.");
    throw error;
  }
  const git = dependencies.git ?? createGitRunner();
  try {
    const currentBranch = gitText(git, loaded.root, ["branch", "--show-current"]);
    const worktreeBranches = parseWorktreeBranches(gitText(git, loaded.root, ["worktree", "list", "--porcelain"]));
    for (const candidate of loaded.plan.candidates) {
      if (candidate.branch === currentBranch || worktreeBranches.has(candidate.branch)) {
        throw new Error(`Planned branch became active in a worktree: ${candidate.branch}`);
      }
    }
    const input = loaded.plan.candidates.map((candidate) => `delete ${candidate.ref} ${candidate.object}`).join("\n") + "\n";
    git(loaded.root, ["update-ref", "--stdin"], { input });
    for (const candidate of loaded.plan.candidates) {
      if (git(loaded.root, ["show-ref", "--verify", "--quiet", candidate.ref], { allowFailure: true }).ok) {
        throw new Error(`Deleted ref still exists: ${candidate.ref}`);
      }
    }
    const completedAt = (dependencies.now ? dependencies.now() : new Date()).toISOString();
    const recovery = loaded.plan.candidates.map((candidate) => ({
      branch: candidate.branch,
      object: candidate.object,
      command: `git branch ${candidate.branch} ${candidate.object}`,
    }));
    const record = { ...pending, status: "applied", completed_at: completedAt, recovery };
    await writeAttempt(attemptFile, record);
    return {
      status: "applied",
      repository: loaded.root,
      plan_path: options.applyPlan,
      plan_sha256: options.expectedPlanSha256.toLowerCase(),
      deleted: loaded.plan.candidates,
      recovery,
      attempt_record: path.relative(loaded.root, attemptFile),
    };
  } catch (error) {
    await writeAttempt(attemptFile, {
      ...pending,
      status: "unresolved",
      detail: error instanceof Error ? error.message : String(error),
      completed_at: (dependencies.now ? dependencies.now() : new Date()).toISOString(),
    });
    throw error;
  }
}

export async function cli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const result = options.applyPlan
    ? await applyMaintenancePlan(options)
    : options.savePlan
      ? await saveMaintenancePlan(await diagnose(options))
      : await diagnose(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  cli().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "error", message: error.message })}\n`);
    process.exitCode = 1;
  });
}
