export const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export async function requestJson(url, { fetchImpl = fetch, timeoutMs = 15000, maxBytes = MAX_RESPONSE_BYTES } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader;
  try {
    const response = await fetchImpl(url, { headers: { accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "igapyon-agent-skills-update-check" }, signal: controller.signal, redirect: "error" });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) throw new Error(`http-${response.status}`);
    const length = response.headers?.get?.("content-length");
    if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
      controller.abort();
      try { Promise.resolve(response.body?.cancel?.()).catch(() => {}); } catch {}
      throw new Error("response-too-large");
    }
    if (!response.body?.getReader) throw new Error("response-body-unavailable");
    reader = response.body.getReader();
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        controller.abort();
        try { Promise.resolve(reader.cancel("response-too-large")).catch(() => {}); } catch {}
        throw new Error("response-too-large");
      }
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks, size);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const link = response.headers?.get?.("link") ?? "";
    const hasNextPage = /<[^>]+>\s*;\s*rel="?next"?/i.test(link);
    return { status: "ok", data: JSON.parse(text), hasNextPage };
  } finally {
    clearTimeout(timer);
    if (reader) { try { reader.releaseLock(); } catch {} }
  }
}

const isSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
function repoUrl(value, owner, repo, pathPattern) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.github.com" && !url.username && !url.password && !url.search && !url.hash && url.pathname === pathPattern(owner, repo);
  } catch { return false; }
}
function webRepoUrl(value, owner, repo, pathname) {
  if (typeof value !== "string") return false;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password && !url.search && !url.hash && url.pathname === pathname; } catch { return false; }
}

export function validateRelease(data, owner, repo) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !Number.isSafeInteger(data.id) || typeof data.tag_name !== "string" || !data.tag_name.trim() || data.draft !== false || data.prerelease !== false ||
    !repoUrl(data.url, owner, repo, (o, r) => `/repos/${o}/${r}/releases/${data.id}`) || !webRepoUrl(data.html_url, owner, repo, `/${owner}/${repo}/releases/tag/${encodeURIComponent(data.tag_name)}`) ||
    !validDate(data.created_at) || !validDate(data.published_at) || !nullableString(data.name) || !nullableString(data.body)) throw new Error("invalid-release-response");
  return { id: data.id, tag: data.tag_name, name: data.name ?? null, url: data.html_url };
}
const validDate = (v) => typeof v === "string" && Number.isFinite(Date.parse(v));
const nullableString = (v) => v === undefined || v === null || typeof v === "string";

export function validateCompare(data, owner, repo, baseSha, headSha, hasNextPage = false) {
  const endpoint = `/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`;
  if (!data || typeof data !== "object" || Array.isArray(data) || data.base_commit?.sha !== baseSha ||
    !repoUrl(data.url, owner, repo, () => endpoint) || !webRepoUrl(data.html_url, owner, repo, `/${owner}/${repo}/compare/${baseSha}...${headSha}`) ||
    !["behind", "ahead", "identical", "diverged"].includes(data.status) || !Number.isSafeInteger(data.ahead_by) || data.ahead_by < 0 || !Number.isSafeInteger(data.behind_by) || data.behind_by < 0 ||
    !Number.isSafeInteger(data.total_commits) || data.total_commits < 0 || !Array.isArray(data.commits) || data.commits.length > 100 || data.commits.length > data.total_commits) throw new Error("invalid-compare-response");
  const seen = new Set();
  const commits = data.commits.map((item) => {
    if (!item || typeof item !== "object" || !isSha(item.sha) || seen.has(item.sha) || typeof item.commit?.message !== "string" || !webRepoUrl(item.html_url, owner, repo, `/${owner}/${repo}/commit/${item.sha}`)) throw new Error("invalid-compare-commit");
    seen.add(item.sha);
    return { sha: item.sha, message: item.commit.message.split("\n")[0], url: item.html_url };
  });
  return { status: data.status, complete: !hasNextPage && commits.length === data.total_commits, totalCommits: data.total_commits, commits };
}
