import { spawnSync } from "node:child_process";
import { ghRepository, matchesIssueUrl, parseRepository } from "./miku-scm-repository.mjs";

export const ISSUE_COMMENTS_QUERY = `query IssueComments($owner: String!, $name: String!, $number: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      url
      updatedAt
      comments(first: 100, after: $cursor) {
        totalCount
        nodes { id url body createdAt author { login } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

export const ISSUE_COMMENTS_PAGE_SIZE = 100;
export const ISSUE_COMMENTS_MAX_PAGES = 100;
export const ISSUE_COMMENTS_MAX_BYTES = 64 * 1024 * 1024;
export const ISSUE_COMMENTS_TIMEOUT_MS = 15_000;
export const ISSUE_COMMENTS_MAX_BUFFER = 16 * 1024 * 1024;

export function createGhCommentsRunner() {
  return (args) => {
    const result = spawnSync("gh", args, {
      encoding: "utf8",
      timeout: ISSUE_COMMENTS_TIMEOUT_MS,
      maxBuffer: ISSUE_COMMENTS_MAX_BUFFER,
    });
    const error = result.error?.message ?? "";
    const stderr = [result.stderr ?? "", error].filter(Boolean).join("\n");
    return {
      ok: result.status === 0 && !result.error,
      status: result.status,
      stdout: result.stdout ?? "",
      stderr,
    };
  };
}

function ghDetail(result) {
  return result?.stderr || result?.stdout || `exit ${result?.status}`;
}

function parseResponse(result, pageNumber, issueNumber) {
  if (!result?.ok || result.status !== 0) {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} fetch failed: ${ghDetail(result)}`);
  }
  let response;
  try {
    response = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned malformed JSON`);
  }
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned malformed response`);
  }
  if (Array.isArray(response.errors) && response.errors.length > 0) {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned partial or failed data`);
  }
  return response;
}

function normalizedComment(node, repository, issueNumber, pageNumber) {
  if (!node || typeof node !== "object" || Array.isArray(node)
    || typeof node.id !== "string" || !node.id.trim()
    || typeof node.url !== "string"
    || typeof node.body !== "string"
    || typeof node.createdAt !== "string" || Number.isNaN(Date.parse(node.createdAt))
    || (node.author !== null && (!node.author || typeof node.author !== "object"
      || typeof node.author.login !== "string" || !node.author.login))) {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} contains malformed comment metadata`);
  }
  const parsed = parseRepository(repository);
  let commentId = "";
  try {
    const url = new URL(node.url);
    commentId = url.hash.match(/^#issuecomment-([1-9]\d*)$/)?.[1] ?? "";
  } catch { /* rejected below */ }
  if (!commentId || !matchesIssueUrl(node.url, ghRepository(parsed), issueNumber, commentId)) {
    throw new Error(`Issue #${issueNumber} comment page ${pageNumber} contains a comment URL outside the requested Issue`);
  }
  return {
    id: node.id,
    url: node.url,
    body: node.body,
    createdAt: node.createdAt,
    author: node.author,
  };
}

function graphqlArgs(repository, issueNumber, cursor) {
  const parsed = parseRepository(repository);
  if (!parsed) throw new Error("Repository must use [host/]owner/repo");
  return [
    "api", "graphql", "--method", "POST",
    ...(parsed.host ? ["--hostname", parsed.host] : []),
    "-f", `query=${ISSUE_COMMENTS_QUERY}`,
    "-f", `owner=${parsed.owner}`,
    "-f", `name=${parsed.repository}`,
    "-F", `number=${issueNumber}`,
    ...(cursor === null ? [] : ["-f", `cursor=${cursor}`]),
  ];
}

export function readCompleteIssueCommentConnection(
  repository,
  issueNumber,
  { gh = createGhCommentsRunner(), expectedUpdatedAt = "" } = {},
) {
  const parsed = parseRepository(repository);
  if (!parsed) throw new Error("Repository must use [host/]owner/repo");
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    throw new Error("Issue number must be a positive integer");
  }
  if (typeof expectedUpdatedAt !== "string" || !expectedUpdatedAt) {
    throw new Error("Expected Issue updatedAt must be a non-empty string");
  }

  const nodes = [];
  const ids = new Set();
  const urls = new Set();
  const cursors = new Set();
  let totalCount = null;
  let expectedIssueUpdatedAt = expectedUpdatedAt;
  let cursor = null;
  let totalBytes = 0;

  for (let page = 0; page < ISSUE_COMMENTS_MAX_PAGES; page += 1) {
    const pageNumber = page + 1;
    const response = parseResponse(gh(graphqlArgs(ghRepository(parsed), issueNumber, cursor)), pageNumber, issueNumber);
    totalBytes += Buffer.byteLength(response && JSON.stringify(response), "utf8");
    if (totalBytes > ISSUE_COMMENTS_MAX_BYTES) {
      throw new Error(`Issue #${issueNumber} comment page ${pageNumber} exceeds the aggregate response limit of ${ISSUE_COMMENTS_MAX_BYTES} bytes`);
    }
    const issue = response.data?.repository?.issue;
    const connection = issue?.comments;
    if (!issue || issue.number !== issueNumber
      || !matchesIssueUrl(issue.url, ghRepository(parsed), issueNumber)
      || typeof issue.updatedAt !== "string" || !issue.updatedAt
      || (expectedIssueUpdatedAt && issue.updatedAt !== expectedIssueUpdatedAt)
      || !connection || !Number.isSafeInteger(connection.totalCount) || connection.totalCount < 0
      || !Array.isArray(connection.nodes)
      || !connection.pageInfo || typeof connection.pageInfo.hasNextPage !== "boolean"
      || (connection.pageInfo.endCursor !== null && typeof connection.pageInfo.endCursor !== "string")) {
      throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned incomplete or mismatched Issue evidence`);
    }
    expectedIssueUpdatedAt ||= issue.updatedAt;
    if (totalCount === null) totalCount = connection.totalCount;
    if (connection.totalCount !== totalCount) {
      throw new Error(`Issue #${issueNumber} comment page ${pageNumber} totalCount changed (expected ${totalCount}, observed ${connection.totalCount})`);
    }
    if (connection.nodes.length > ISSUE_COMMENTS_PAGE_SIZE) {
      throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned ${connection.nodes.length} nodes; maximum is ${ISSUE_COMMENTS_PAGE_SIZE}`);
    }
    for (const rawComment of connection.nodes) {
      const comment = normalizedComment(rawComment, ghRepository(parsed), issueNumber, pageNumber);
      if (ids.has(comment.id) || urls.has(comment.url)) {
        throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned a duplicate comment id or URL`);
      }
      ids.add(comment.id);
      urls.add(comment.url);
      nodes.push(comment);
      if (nodes.length > totalCount) {
        throw new Error(`Issue #${issueNumber} comments exceed totalCount ${totalCount} (observed ${nodes.length})`);
      }
    }
    if (!connection.pageInfo.hasNextPage) {
      if (nodes.length !== totalCount) {
        throw new Error(`Issue #${issueNumber} comments final count mismatch (expected ${totalCount}, observed ${nodes.length})`);
      }
      return { nodes, totalCount, pageInfo: { hasNextPage: false, endCursor: null } };
    }
    const nextCursor = connection.pageInfo.endCursor;
    if (typeof nextCursor !== "string" || !nextCursor || cursors.has(nextCursor)
      || connection.nodes.length === 0) {
      throw new Error(`Issue #${issueNumber} comment page ${pageNumber} returned an invalid next cursor`);
    }
    cursors.add(nextCursor);
    cursor = nextCursor;
  }
  throw new Error(`Issue #${issueNumber} comment pagination limit exceeded (${ISSUE_COMMENTS_MAX_PAGES} pages)`);
}
