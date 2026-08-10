#!/usr/bin/env node

import { realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  executePublish,
  runPublish,
  savePublicationPlan,
} from "./post-recommit-publish.mjs";
import { runRecommit } from "./pr-soft-reset-recommit-preflight.mjs";

export const usage = `Usage:
  node skills/igapyon-miku-scm/scripts/pr-recommit-push.mjs \\
    --base <git-ref> --pr-draft <repository-relative-path> \\
    [--repo <path>] [--remote <name>] --apply

Runs one explicitly authorized transition: fixes the remote expectation, creates
a local backup, soft-resets and recommits the reviewed draft, then publishes
only when that exact remote expectation still holds. It never creates or merges
a Pull Request, creates or moves a tag, or publishes a GitHub Release.`;

export function parseArgs(argv, cwd = process.cwd()) {
  const options = {
    repo: cwd,
    remote: "origin",
    base: "",
    prDraft: "",
    apply: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--remote") options.remote = argv[++index] ?? "";
    else if (arg === "--base") options.base = argv[++index] ?? "";
    else if (arg === "--pr-draft") options.prDraft = argv[++index] ?? "";
    else if (arg === "--apply") options.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!options.repo) throw new Error("--repo must not be empty");
  if (!/^[A-Za-z0-9._-]+$/.test(options.remote)) {
    throw new Error("--remote must be a Git remote name");
  }
  if (!options.base) throw new Error("--base is required");
  if (!options.prDraft) throw new Error("--pr-draft is required");
  if (!options.apply) throw new Error("pr.recommit.push requires --apply");
  return options;
}

function asFailure(error, mutationInvoked) {
  const failure = error instanceof Error ? error : new Error(String(error));
  failure.mutationInvoked = mutationInvoked;
  return failure;
}

function publicationOptions({ repo, remote, expectedHead, expectedRemoteHead = "", expectNewRemoteBranch = false }) {
  return {
    repo,
    remote,
    expectedHead,
    expectedRemoteHead,
    expectNewRemoteBranch,
    apply: false,
    savePlan: false,
    applyPlan: "",
    expectedPlanSha256: "",
    help: false,
  };
}

function expectedRemoteOptions(publication) {
  return publication.remote_branch.state === "existing"
    ? { expectedRemoteHead: publication.remote_branch.head, expectNewRemoteBranch: false }
    : { expectedRemoteHead: "", expectNewRemoteBranch: true };
}

function partialResult(recommit, initialPublication, stage, error) {
  return {
    status: "partial",
    mode: "apply",
    repository: recommit.repository,
    branch: recommit.branch,
    base: recommit.base,
    base_commit: recommit.base_commit,
    backup_branch: recommit.backup_branch,
    pr_draft: recommit.pr_draft,
    pr_draft_sha256: recommit.pr_draft_sha256,
    commits_to_collapse: recommit.commits_to_collapse,
    new_head: recommit.new_head,
    final_status: recommit.final_status,
    initial_remote_branch: initialPublication.remote_branch,
    publication: {
      status: "conflict",
      stage,
      message: error instanceof Error ? error.message : String(error),
    },
    mutation_invoked: true,
  };
}

export async function runRecommitPush(options, dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const recommit = dependencies.recommit ?? runRecommit;
  const publish = dependencies.publish ?? runPublish;
  const publishExecute = dependencies.publishExecute ?? executePublish;
  const recommitDependencies = dependencies.recommitDependencies;
  const publishDependencies = { ...dependencies.publishDependencies, platform };

  if (platform !== "darwin") {
    throw asFailure(
      new Error(`pr.recommit.push apply is supported only on macOS; current platform is ${platform}`),
      false,
    );
  }

  let initialPublication;
  let recommitResult;
  try {
    const recommitPreflight = await recommit({
      repo: options.repo,
      base: options.base,
      prDraft: options.prDraft,
      apply: false,
      allowDirty: false,
    }, recommitDependencies);
    if (recommitPreflight.status !== "preflight-ok") {
      return { ...recommitPreflight, status: "not-applied", mode: "apply", mutation_invoked: false };
    }

    initialPublication = await publish(publicationOptions({
      repo: options.repo,
      remote: options.remote,
      expectedHead: recommitPreflight.head,
    }), publishDependencies);
    if (initialPublication.status !== "preflight-ok") {
      return {
        ...recommitPreflight,
        status: "not-applied",
        mode: "apply",
        publication: initialPublication,
        mutation_invoked: false,
      };
    }

    recommitResult = await recommit({
      repo: options.repo,
      base: options.base,
      prDraft: options.prDraft,
      apply: true,
      allowDirty: false,
    }, recommitDependencies);
    if (recommitResult.status !== "recommitted") {
      return {
        ...recommitResult,
        status: "not-applied",
        mode: "apply",
        initial_remote_branch: initialPublication.remote_branch,
        mutation_invoked: Boolean(recommitResult.mutation_invoked),
      };
    }
  } catch (error) {
    const mutationInvoked = error && typeof error === "object" && Object.hasOwn(error, "mutationInvoked")
      ? error.mutationInvoked
      : false;
    throw asFailure(error, mutationInvoked);
  }

  const expectation = expectedRemoteOptions(initialPublication);
  let savedPlan;
  try {
    const verifiedPublication = await publish(publicationOptions({
      repo: options.repo,
      remote: options.remote,
      expectedHead: recommitResult.new_head,
      ...expectation,
    }), publishDependencies);
    const root = await realpath(options.repo);
    savedPlan = await savePublicationPlan(root, verifiedPublication);
  } catch (error) {
    return partialResult(recommitResult, initialPublication, "publication-preflight", error);
  }

  try {
    const publication = await publishExecute({
      repo: options.repo,
      remote: options.remote,
      expectedHead: "",
      expectedRemoteHead: "",
      expectNewRemoteBranch: false,
      apply: false,
      savePlan: false,
      applyPlan: savedPlan.plan_path,
      expectedPlanSha256: savedPlan.plan_sha256,
      help: false,
    }, publishDependencies);
    return {
      status: "published",
      mode: "apply",
      repository: recommitResult.repository,
      branch: recommitResult.branch,
      base: recommitResult.base,
      base_commit: recommitResult.base_commit,
      backup_branch: recommitResult.backup_branch,
      pr_draft: recommitResult.pr_draft,
      pr_draft_sha256: recommitResult.pr_draft_sha256,
      commits_to_collapse: recommitResult.commits_to_collapse,
      new_head: recommitResult.new_head,
      initial_remote_branch: initialPublication.remote_branch,
      publication,
      ...publication,
      mutation_invoked: true,
    };
  } catch (error) {
    if (error?.mutationInvoked === null) throw asFailure(error, null);
    return partialResult(recommitResult, initialPublication, "publication-apply", error);
  }
}

export async function cli(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(await runRecommitPush(options, dependencies), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  cli().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
