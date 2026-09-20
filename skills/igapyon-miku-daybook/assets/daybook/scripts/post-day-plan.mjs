#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalPlanPath, parseFrontMatter, validateIsoDate } from "./day-plan.mjs";

function parseArgs(args) {
  const options = { serverUrl: process.env.GITHUB_SERVER_URL || "https://github.com", apiUrl: process.env.GITHUB_API_URL };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--file") options.file = args[++index];
    else if (arg === "--date") options.date = args[++index];
    else if (arg === "--issue-number") options.issueNumber = args[++index];
    else if (arg === "--repo") options.repo = args[++index];
    else if (arg === "--sha") options.sha = args[++index];
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function requireOption(options, name) {
  if (!options[name]) throw new Error(`missing option: --${name.replaceAll(/([A-Z])/g, "-$1").toLowerCase()}`);
  return options[name];
}

function absoluteGitHubUrl(serverUrl, repo, sha, relativePath) {
  const base = serverUrl.replace(/\/$/, "");
  return `${base}/${repo}/blob/${sha}/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function markerForDate(date) {
  return `<!-- daybook-briefing:${date} -->`;
}

export function renderComment({ markdown, date, repo, sha, mention = process.env.DAYBOOK_MENTION || "@igapyon", serverUrl = "https://github.com" }) {
  validateIsoDate(date, "date");
  if (!repo || !sha) throw new Error("repo and sha are required to render a GitHub comment");
  const parsed = parseFrontMatter(markdown, "day-plan");
  const canonicalPath = canonicalPlanPath(date);
  const body = parsed.body.trim().replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href)) return match;
    const sourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(canonicalPath), href));
    if (sourcePath.startsWith("../") || sourcePath === "..") return match;
    return `[${label}](${absoluteGitHubUrl(serverUrl, repo, sha, sourcePath)})`;
  });
  return `${markerForDate(date)}\n\n${mention}\n\n${body}\n`;
}

function parseNextLink(header) {
  if (!header) return null;
  const next = header.split(",").find((part) => part.includes('rel="next"'));
  return next?.match(/<([^>]+)>/)?.[1] || null;
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response;
}

async function listComments({ apiUrl, repo, issueNumber, token }) {
  const comments = [];
  let next = `${apiUrl}/repos/${repo}/issues/${issueNumber}/comments?per_page=100`;
  while (next) {
    const response = await githubRequest(next, token);
    comments.push(...await response.json());
    next = parseNextLink(response.headers.get("link"));
  }
  return comments;
}

async function getIssue({ apiUrl, repo, issueNumber, token }) {
  const response = await githubRequest(`${apiUrl}/repos/${repo}/issues/${issueNumber}`, token);
  return response.json();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function existingBriefing(comments, date) {
  const markerPattern = new RegExp(`<!--\\s*daybook-briefing:${escapeRegExp(date)}(?::[^>]*?)?\\s*-->`);
  return comments.find((comment) => comment.user?.type === "Bot" && markerPattern.test(comment.body ?? ""));
}

async function postComment({ apiUrl, repo, issueNumber, token, body }) {
  const response = await githubRequest(`${apiUrl}/repos/${repo}/issues/${issueNumber}/comments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return response.json();
}

export async function postDayPlan(options) {
  const body = renderComment(options);
  const marker = markerForDate(options.date);
  if (options.dryRun) return { status: "dry-run", marker, body };
  const token = options.token || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required unless --dry-run is used");
  const defaultApiUrl = options.serverUrl === "https://github.com" ? "https://api.github.com" : `${options.serverUrl}/api/v3`;
  const apiUrl = (options.apiUrl || process.env.GITHUB_API_URL || defaultApiUrl).replace(/\/$/, "");
  const issue = await getIssue({ apiUrl, repo: options.repo, issueNumber: options.issueNumber, token });
  if (issue.pull_request) throw new Error(`target is a pull request, not an issue: #${options.issueNumber}`);
  if (issue.state !== "open") throw new Error(`target issue is not open: #${options.issueNumber}`);
  const comments = await listComments({ apiUrl, repo: options.repo, issueNumber: options.issueNumber, token });
  const existing = existingBriefing(comments, options.date);
  if (existing) return { status: "skipped", marker, url: existing.html_url };
  try {
    const created = await postComment({ apiUrl, repo: options.repo, issueNumber: options.issueNumber, token, body });
    return { status: "created", marker, url: created.html_url };
  } catch (error) {
    const afterFailure = await listComments({ apiUrl, repo: options.repo, issueNumber: options.issueNumber, token });
    const accepted = existingBriefing(afterFailure, options.date);
    if (accepted) return { status: "skipped-after-uncertain-post", marker, url: accepted.html_url };
    const retry = await postComment({ apiUrl, repo: options.repo, issueNumber: options.issueNumber, token, body });
    return { status: "created-after-retry", marker, url: retry.html_url };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/post-day-plan.mjs --file FILE --date YYYY-MM-DD --issue-number NUMBER --repo OWNER/REPO --sha SHA [--dry-run]");
    return;
  }
  const file = path.resolve(requireOption(options, "file"));
  const date = validateIsoDate(requireOption(options, "date"), "date");
  const issueNumber = Number.parseInt(requireOption(options, "issueNumber"), 10);
  if (!Number.isInteger(issueNumber) || issueNumber < 1) throw new Error("issue number must be a positive integer");
  const repo = requireOption(options, "repo");
  const sha = requireOption(options, "sha");
  const markdown = fs.readFileSync(file, "utf8");
  const result = await postDayPlan({ ...options, file, date, issueNumber, repo, sha, markdown });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "dry-run") console.log(result.body);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
