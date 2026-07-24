#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \\
    --expected-head <reviewed-full-sha> [--repo <path>] [--remote <name>]

  node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \\
    --expected-head <reviewed-full-sha> \\
    (--expected-remote-head <reviewed-full-sha> | --expect-new-remote-branch) \\
    --apply [--repo <path>] [--remote <name>]

  node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \\
    --expected-head <reviewed-full-sha> --save-plan [--repo <path>] [--remote <name>]

  node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \\
    --apply-plan <workplace/miku-scm/ok-push/*.json> --expected-plan-sha256 <sha256>

Default mode is a read-only preflight. It resolves the exact remote branch
state and returns the arguments that must be reviewed before apply mode.

Apply mode pushes only the reviewed local HEAD. An existing remote branch
also requires its previously reviewed full SHA and uses an explicit
--force-with-lease=<ref>:<sha>. A new branch requires the explicit
--expect-new-remote-branch assertion.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repo: cwd,
    remote: "origin",
    expectedHead: "",
    expectedRemoteHead: "",
    expectNewRemoteBranch: false,
    apply: false,
    savePlan: false,
    applyPlan: "",
    expectedPlanSha256: "",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--repo") {
      options.repo = argv[++index] ?? "";
    } else if (arg === "--remote") {
      options.remote = argv[++index] ?? "";
    } else if (arg === "--expected-head") {
      options.expectedHead = argv[++index] ?? "";
    } else if (arg === "--expected-remote-head") {
      options.expectedRemoteHead = argv[++index] ?? "";
    } else if (arg === "--expect-new-remote-branch") {
      options.expectNewRemoteBranch = true;
    } else if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--save-plan") {
      options.savePlan = true;
    } else if (arg === "--apply-plan") {
      options.applyPlan = argv[++index] ?? "";
    } else if (arg === "--expected-plan-sha256") {
      options.expectedPlanSha256 = argv[++index] ?? "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.help) return options;
  if (!options.repo) throw new Error("--repo must not be empty");
  if (!/^[A-Za-z0-9._-]+$/.test(options.remote)) {
    throw new Error("--remote must be a Git remote name");
  }
  if (options.applyPlan) {
    if (options.expectedHead || options.expectedRemoteHead || options.expectNewRemoteBranch || options.apply || options.savePlan) {
      throw new Error("--apply-plan cannot be combined with ordinary publication arguments");
    }
    if (!/^[0-9a-f]{64}$/i.test(options.expectedPlanSha256)) throw new Error("--apply-plan requires --expected-plan-sha256");
    if (!/^workplace\/miku-scm\/ok-push\/[A-Za-z0-9._-]+\.json$/.test(options.applyPlan)) throw new Error("--apply-plan must be a plan under workplace/miku-scm/ok-push");
    return options;
  }
  if (!SHA_PATTERN.test(options.expectedHead)) {
    throw new Error("--expected-head must be a full 40- or 64-character hexadecimal object ID");
  }
  if (options.expectedRemoteHead && !SHA_PATTERN.test(options.expectedRemoteHead)) {
    throw new Error("--expected-remote-head must be a full 40- or 64-character hexadecimal object ID");
  }
  if (options.expectedRemoteHead && options.expectNewRemoteBranch) {
    throw new Error("Use exactly one remote expectation: --expected-remote-head or --expect-new-remote-branch");
  }
  if (options.apply && !options.expectedRemoteHead && !options.expectNewRemoteBranch) {
    throw new Error("--apply requires --expected-remote-head or --expect-new-remote-branch");
  }
  if (options.savePlan && (options.apply || options.expectedRemoteHead || options.expectNewRemoteBranch)) {
    throw new Error("--save-plan is available only with ordinary read-only preflight");
  }
  return options;
}

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

function planDirectory(root) { return path.join(root, "workplace", "miku-scm", "ok-push"); }

async function savePlan(root, result) {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  const plan = { schema_version: 1, repository: result.repository, branch: result.branch, remote: result.remote,
    reviewed_head: result.head, remote_branch: result.remote_branch, done_branch: `${result.branch}-done`,
    preflight_at: new Date().toISOString(), push_mode: result.remote_branch.state === "absent" ? "new-branch" : "force-with-explicit-lease" };
  const content = `${JSON.stringify(plan, null, 2)}\n`;
  const digest = sha256(content);
  const filename = `ok-push-${result.branch}-${result.head.slice(0, 12)}-${timestamp}.json`;
  const directory = planDirectory(root);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, filename);
  await writeFile(file, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return { ...result, plan_path: path.relative(root, file), plan_sha256: digest, publication_plan: plan };
}

async function loadPlan(options) {
  const root = await realpath(options.repo);
  const file = path.resolve(root, options.applyPlan);
  const directory = await realpath(planDirectory(root));
  if (!file.startsWith(`${directory}${path.sep}`)) throw new Error("Plan path escapes the plan directory");
  const content = await readFile(file, "utf8");
  if (sha256(content) !== options.expectedPlanSha256.toLowerCase()) throw new Error("Publication plan SHA-256 changed");
  const plan = JSON.parse(content);
  if (plan?.schema_version !== 1 || !SHA_PATTERN.test(plan.reviewed_head) || !/^[A-Za-z0-9._-]+$/.test(plan.remote)
    || typeof plan.branch !== "string" || !["absent", "existing"].includes(plan?.remote_branch?.state)) throw new Error("Malformed publication plan");
  return { root, file, plan };
}

export function createGitRunner() {
  return (cwd, args, options = {}) => {
    const result = spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    const response = {
      ok: result.status === 0,
      status: result.status,
      stdout: (result.stdout || "").trimEnd(),
      stderr: (result.stderr || "").trimEnd(),
    };
    if (!response.ok && !options.allowFailure) {
      const message = response.stderr || response.stdout;
      throw new Error(`git ${args.join(" ")} failed${message ? `: ${message}` : ""}`);
    }
    return response;
  };
}

function gitText(git, cwd, args, options) {
  return git(cwd, args, options).stdout.trim();
}

function assertUnchanged(label, actual, expected) {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${label} changed: expected ${expected}, actual ${actual || "unresolved"}`);
  }
}

function parseRemoteHead(output, branch) {
  if (!output.trim()) return "";
  const expectedRef = `refs/heads/${branch}`;
  const matches = output
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length === 2 && parts[1] === expectedRef);
  if (matches.length !== 1 || !SHA_PATTERN.test(matches[0][0])) {
    throw new Error(`Could not resolve one exact remote head for ${expectedRef}`);
  }
  return matches[0][0].toLowerCase();
}

function remoteHead(git, root, remote, branch) {
  return parseRemoteHead(
    gitText(git, root, ["ls-remote", "--heads", remote, `refs/heads/${branch}`]),
    branch,
  );
}

function validateRemoteExpectation(actualRemoteHead, options) {
  if (options.expectedRemoteHead) {
    if (!actualRemoteHead) {
      throw new Error("Remote branch disappeared after it was reviewed");
    }
    assertUnchanged("remote branch HEAD", actualRemoteHead, options.expectedRemoteHead);
  } else if (options.expectNewRemoteBranch && actualRemoteHead) {
    throw new Error(`Remote branch appeared after it was reviewed: ${actualRemoteHead}`);
  }
}

function canonicalGitHubRepository(remoteUrl) {
  let owner = "";
  let repository = "";
  const scpMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (scpMatch) {
    [, owner, repository] = scpMatch;
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
  if (!owner || !repository || !/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) {
    return null;
  }
  return {
    owner,
    repository,
    url: `https://github.com/${owner}/${repository}`,
  };
}

function encodeAlphabeticSequence(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(97 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function chooseUniqueConvention(candidates) {
  const sorted = candidates.filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return "";
  if (sorted.length > 1 && sorted[0].count === sorted[1].count) return "";
  return sorted[0].tag;
}

async function resolveRecommendedTag(root, git) {
  let version = "";
  try {
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    if (typeof packageJson.version === "string") version = packageJson.version;
  } catch {
    // package.json is optional.
  }
  if (!version) {
    try {
      const pom = await readFile(path.join(root, "pom.xml"), "utf8");
      version = pom.match(/<project\b[\s\S]*?<version>([^<]+)<\/version>/)?.[1]?.trim() ?? "";
    } catch {
      // pom.xml is optional.
    }
  }
  if (!version) return { version: "unresolved", tag: "unresolved" };

  const tags = gitText(git, root, ["tag", "--list"], { allowFailure: true }).split("\n").filter(Boolean);
  const dateMatch = version.match(/^1\.(\d{8})\.([1-9]\d*)$/);
  if (dateMatch) {
    const [, date, sequenceText] = dateMatch;
    const suffix = encodeAlphabeticSequence(Number(sequenceText));
    const tag = chooseUniqueConvention([
      { count: tags.filter((item) => /^v\d{8}[a-z]+$/.test(item)).length, tag: `v${date}${suffix}` },
      { count: tags.filter((item) => /^\d{8}[a-z]+$/.test(item)).length, tag: `${date}${suffix}` },
      { count: tags.filter((item) => /^v1\.\d{8}\.\d+$/.test(item)).length, tag: `v${version}` },
    ]);
    return { version, tag: tag || "unresolved" };
  }

  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
    const tag = chooseUniqueConvention([
      { count: tags.filter((item) => /^v\d+\.\d+\.\d+(?:[-+].*)?$/.test(item)).length, tag: `v${version}` },
      { count: tags.filter((item) => /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(item)).length, tag: version },
    ]);
    return { version, tag: tag || "unresolved" };
  }
  return { version, tag: "unresolved" };
}

function createGhRunner() {
  return (args) => {
    const result = spawnSync("gh", args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return { ok: result.status === 0, stdout: (result.stdout || "").trim(), stderr: (result.stderr || "").trim(), error: result.error };
  };
}

function resolvePrHandoff(repository, branch, gh) {
  if (!repository) {
    return { repository_url: "unresolved", pr_url: "unresolved", pr_lookup: "unresolved" };
  }
  const creationUrl = `${repository.url}/pull/new/${encodeURIComponent(branch)}`;
  if (typeof gh !== "function") {
    return { repository_url: repository.url, pr_creation_url: creationUrl, pr_lookup: "unconfirmed" };
  }
  try {
    const result = gh(["pr", "list", "--repo", `${repository.owner}/${repository.repository}`,
      "--head", branch, "--state", "open", "--limit", "100", "--json", "url"]);
    if (!result?.ok) throw new Error(result?.stderr || result?.stdout || result?.error?.message || "gh pr list failed");
    const pulls = JSON.parse(result.stdout);
    if (!Array.isArray(pulls)) throw new Error("GitHub API returned a non-array response");
    const urls = pulls.map((entry) => entry?.html_url).filter((url) => typeof url === "string" && url);
    if (urls.length === 1) {
      return { repository_url: repository.url, pr_url: urls[0], pr_lookup: "confirmed" };
    }
    if (urls.length > 1) {
      return { repository_url: repository.url, pr_urls: urls, pr_lookup: "ambiguous" };
    }
    return { repository_url: repository.url, pr_creation_url: creationUrl, pr_lookup: "confirmed-none" };
  } catch (error) {
    return {
      repository_url: repository.url,
      pr_creation_url: creationUrl,
      pr_lookup: "unconfirmed",
      pr_lookup_warning: error instanceof Error ? error.message : String(error),
    };
  }
}

function preflightApplyArguments(options, head, actualRemoteHead) {
  const result = ["--expected-head", head];
  if (actualRemoteHead) result.push("--expected-remote-head", actualRemoteHead);
  else result.push("--expect-new-remote-branch");
  if (options.repo !== process.cwd()) result.push("--repo", options.repo);
  if (options.remote !== "origin") result.push("--remote", options.remote);
  result.push("--apply");
  return result;
}

export async function runPublish(options, dependencies = {}) {
  const git = dependencies.git ?? createGitRunner();
  const platform = dependencies.platform ?? process.platform;
  const gh = Object.hasOwn(dependencies, "gh") ? dependencies.gh : createGhRunner();
  const root = gitText(git, options.repo, ["rev-parse", "--show-toplevel"]);
  const branch = gitText(git, root, ["branch", "--show-current"], { allowFailure: true });
  if (!branch) throw new Error("Current branch is detached or unresolved");
  if (branch.endsWith("-done")) throw new Error(`Current branch is frozen: ${branch}`);
  gitText(git, root, ["check-ref-format", "--branch", branch]);

  const head = gitText(git, root, ["rev-parse", "HEAD"]).toLowerCase();
  assertUnchanged("local HEAD", head, options.expectedHead);
  const statusPorcelain = gitText(git, root, ["status", "--porcelain"]);
  if (statusPorcelain) throw new Error("Working tree or index is dirty");

  const doneBranch = `${branch}-done`;
  if (git(root, ["show-ref", "--verify", "--quiet", `refs/heads/${doneBranch}`], { allowFailure: true }).ok) {
    throw new Error(`Local completion branch already exists: ${doneBranch}`);
  }

  const remoteUrl = gitText(git, root, ["remote", "get-url", options.remote]);
  const upstreamResult = git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    allowFailure: true,
  });
  const upstream = upstreamResult.ok ? upstreamResult.stdout.trim() : "";

  const initialRemoteHead = remoteHead(git, root, options.remote, branch);
  validateRemoteExpectation(initialRemoteHead, options);
  if (initialRemoteHead && upstream && upstream !== `${options.remote}/${branch}`) {
    throw new Error(`Current upstream does not match the existing push target: ${upstream}`);
  }
  const common = {
    repository: path.basename(root),
    branch,
    remote: options.remote,
    upstream: upstream || "none",
    head,
    remote_branch: initialRemoteHead
      ? { state: "existing", head: initialRemoteHead }
      : { state: "absent" },
  };

  if (!options.apply) {
    return {
      status: "preflight-ok",
      mode: "preflight",
      readonly: true,
      platform,
      ...common,
      apply_arguments: preflightApplyArguments(options, head, initialRemoteHead),
    };
  }

  if (platform !== "darwin") {
    throw new Error(`Apply mode is supported only on macOS; current platform is ${platform}`);
  }

  gitText(git, root, ["fetch", options.remote]);
  const remoteHeadAfterFetch = remoteHead(git, root, options.remote, branch);
  validateRemoteExpectation(remoteHeadAfterFetch, options);
  assertUnchanged("local HEAD after fetch", gitText(git, root, ["rev-parse", "HEAD"]), head);
  if (gitText(git, root, ["status", "--porcelain"])) {
    throw new Error("Working tree or index became dirty after fetch");
  }

  const destination = `refs/heads/${branch}`;
  let pushMode;
  if (options.expectedRemoteHead) {
    pushMode = "force-with-explicit-lease";
    gitText(git, root, [
      "push",
      `--force-with-lease=${destination}:${options.expectedRemoteHead.toLowerCase()}`,
      options.remote,
      `HEAD:${destination}`,
    ]);
  } else {
    pushMode = "new-branch";
    gitText(git, root, ["push", "-u", options.remote, `HEAD:${destination}`]);
  }

  gitText(git, root, ["fetch", options.remote]);
  const comparison = gitText(git, root, [
    "rev-list",
    "--left-right",
    "--count",
    `HEAD...refs/remotes/${options.remote}/${branch}`,
  ]).replace(/\s+/g, " ");
  if (comparison !== "0 0") {
    throw new Error(`Post-push local/remote comparison failed: ${comparison || "unresolved"}`);
  }

  gitText(git, root, ["branch", "-m", branch, doneBranch]);
  const finalStatus = gitText(git, root, ["status", "-sb"]);
  const repository = canonicalGitHubRepository(remoteUrl);
  const prHandoff = resolvePrHandoff(repository, branch, gh);
  const recommended = await resolveRecommendedTag(root, git);

  return {
    status: "published",
    mode: "apply",
    ...common,
    push_mode: pushMode,
    pushed_branch: branch,
    final_branch: doneBranch,
    comparison,
    final_status: finalStatus,
    ...prHandoff,
    version: recommended.version,
    recommended_tag: recommended.tag,
    human_handoff: "PRとタグはgithub上で操作してください。",
    tag_mutation: false,
    pull_request_mutation: false,
  };
}

export async function cli(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (options.applyPlan) {
    const loaded = await loadPlan(options);
    const plan = loaded.plan;
    const attempt = `${loaded.file}.attempt.json`;
    const pending = { schema_version: 1, status: "pending", plan_sha256: options.expectedPlanSha256.toLowerCase(), started_at: new Date().toISOString() };
    let handle;
    try {
      handle = await open(attempt, "wx", 0o600);
      await handle.writeFile(`${JSON.stringify(pending, null, 2)}\n`, "utf8");
      await handle.sync();
    } catch (error) {
      if (error?.code === "EEXIST") throw new Error("This publication plan already has an attempt. Do not retry it.");
      throw error;
    } finally { await handle?.close(); }
    const ordinary = {
      repo: loaded.root, remote: plan.remote, expectedHead: plan.reviewed_head,
      expectedRemoteHead: plan.remote_branch.state === "existing" ? plan.remote_branch.head : "",
      expectNewRemoteBranch: plan.remote_branch.state === "absent", apply: true, savePlan: false, applyPlan: "", expectedPlanSha256: "", help: false,
    };
    try {
      const result = await runPublish(ordinary, dependencies);
      await writeFile(attempt, `${JSON.stringify({ ...pending, status: "published", result_recorded_at: new Date().toISOString() }, null, 2)}\n`, "utf8");
      process.stdout.write(`${JSON.stringify({ ...result, plan_path: options.applyPlan, plan_sha256: options.expectedPlanSha256.toLowerCase(), attempt_record: path.relative(loaded.root, attempt) }, null, 2)}\n`);
    } catch (error) {
      await writeFile(attempt, `${JSON.stringify({ ...pending, status: "unresolved", detail: error instanceof Error ? error.message : String(error), result_recorded_at: new Date().toISOString() }, null, 2)}\n`, "utf8");
      throw error;
    }
    return;
  }
  let result = await runPublish(options, dependencies);
  if (options.savePlan) result = await savePlan(await realpath(options.repo), result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  cli().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
