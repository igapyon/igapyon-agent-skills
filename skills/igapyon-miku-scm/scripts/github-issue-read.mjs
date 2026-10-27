#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { ghRepository, parseRepository } from "./miku-scm-repository.mjs";

import { normalizeIssueCommentConnection } from "./miku-scm-issue-approval.mjs";

function usage() {
  return `Usage: github-issue-read.mjs --repo <[host/]owner/repo> (--list [--state <open|closed|all>] | --issue <number> | --labels)

Options:
  --repo <[host/]owner/repo>             Repository to inspect
  --list                            List Issues (default state: open)
  --state <open|closed|all>         State for --list
  --issue <positive-number>         Read one Issue with its comments
  --labels                          List repository labels
  --help                            Show this help
`;
}

export function parseArgs(argv) {
  const options = { repo: "", mode: "", state: "open", issue: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return { help: true };
    if (arg === "--repo") options.repo = argv[++index] ?? "";
    else if (arg === "--list") options.mode = options.mode ? "invalid" : "list";
    else if (arg === "--state") options.state = argv[++index] ?? "";
    else if (arg === "--issue") {
      options.mode = options.mode ? "invalid" : "issue";
      options.issue = Number(argv[++index]);
    } else if (arg === "--labels") options.mode = options.mode ? "invalid" : "labels";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!parseRepository(options.repo)) {
    throw new Error("--repo must use [host/]owner/repository");
  }
  options.repo = ghRepository(parseRepository(options.repo));
  if (!new Set(["list", "issue", "labels"]).has(options.mode)) {
    throw new Error("Specify exactly one of --list, --issue, or --labels");
  }
  if (!new Set(["open", "closed", "all"]).has(options.state)) {
    throw new Error("--state must be open, closed, or all");
  }
  if (options.mode !== "list" && options.state !== "open") {
    throw new Error("--state is only valid with --list");
  }
  if (options.mode === "issue" && (!Number.isSafeInteger(options.issue) || options.issue < 1)) {
    throw new Error("--issue must be a positive integer");
  }
  return options;
}

function defaultGh(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function runGh(gh, args) {
  const result = gh(args);
  if (!result?.ok || result.status !== 0) {
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${(result?.stderr || result?.stdout || "unknown failure").trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("gh returned malformed JSON");
  }
}

function normalizeIssue(issue) {
  if (!issue || !Number.isSafeInteger(issue.number) || issue.number < 1
    || typeof issue.state !== "string" || typeof issue.title !== "string"
    || typeof issue.body !== "string" || typeof issue.url !== "string" || typeof issue.updatedAt !== "string") {
    throw new Error("gh returned malformed Issue metadata");
  }
  return {
    number: issue.number, state: issue.state, title: issue.title, body: issue.body,
    html_url: issue.url, updated_at: issue.updatedAt,
  };
}

export function runIssueRead(options, { gh = defaultGh } = {}) {
  if (options.mode === "list") {
    const entries = runGh(gh, ["issue", "list", "--repo", options.repo, "--state", options.state,
      "--limit", "1000", "--json", "number,state,title,body,url,updatedAt"]);
    if (!Array.isArray(entries)) throw new Error("gh issue list returned a non-array response");
    return { mode: "list", repository: options.repo, state: options.state, issues: entries.map(normalizeIssue) };
  }
  if (options.mode === "issue") {
    const issue = runGh(gh, ["issue", "view", String(options.issue), "--repo", options.repo,
      "--json", "number,state,title,body,url,updatedAt,labels,comments"]);
    const normalized = normalizeIssue(issue);
    if (!Array.isArray(issue.labels)) {
      throw new Error("gh issue view returned malformed labels");
    }
    normalizeIssueCommentConnection(issue.comments);
    const comments = issue.comments.nodes ?? issue.comments.Nodes;
    return { mode: "issue", repository: options.repo, issue: { ...normalized, labels: issue.labels, comments } };
  }
  const labels = runGh(gh, ["label", "list", "--repo", options.repo, "--limit", "1000", "--json", "name,description,color"]);
  if (!Array.isArray(labels) || labels.some((label) => !label || typeof label.name !== "string")) {
    throw new Error("gh label list returned malformed label metadata");
  }
  return { mode: "labels", repository: options.repo, labels };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  process.stdout.write(`${JSON.stringify(runIssueRead(options), null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
