// Repository identity is determined by the selected host and path, without a
// github.com allowlist. API operations still require a compatible gh/API surface.
const COMPONENT = /^[A-Za-z0-9_.-]+$/;

function validComponent(value) {
  return COMPONENT.test(value) && value !== "." && value !== "..";
}

function normalizedHost(value) {
  if (typeof value !== "string"
    || !/^(?:[A-Za-z0-9][A-Za-z0-9_.-]*|\[[0-9A-Fa-f:]+\])(?::[1-9][0-9]{0,4})?$/.test(value)) return null;
  try {
    const url = new URL(`https://${value}`);
    return url.host && url.pathname === "/" && !url.username && !url.password
      ? url.host.toLowerCase() : null;
  } catch { return null; }
}

export function parseRepository(value) {
  if (typeof value !== "string") return null;
  const parts = value.split("/");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.length === 3 && !parts[0]) return null;
  const [owner, repository] = parts.slice(-2);
  if (!validComponent(owner) || !validComponent(repository)) return null;
  const requestedHost = parts.length === 3 ? parts[0] : process.env.GH_HOST;
  const host = requestedHost ? normalizedHost(requestedHost) : "";
  if (requestedHost && !host) return null;
  return { host, owner, repository, full_name: `${owner}/${repository}` };
}

export function repositoryFromRemote(value) {
  if (typeof value !== "string") return null;
  let host, pathname, origin;
  const scp = /^(?:[^@/:\s]+@)?([^/:\s]+):([^/].*)$/.exec(value);
  if (scp && !value.includes("://") && !/^[A-Za-z]:[\\/]/.test(value)) {
    host = normalizedHost(scp[1]);
    pathname = scp[2];
    origin = `https://${host}`;
  } else {
    try {
      const url = new URL(value);
      if (!["https:", "http:", "ssh:", "git:"].includes(url.protocol)
        || url.search || url.hash) return null;
      host = normalizedHost(["https:", "http:"].includes(url.protocol) ? url.host : url.hostname);
      pathname = url.pathname;
      origin = ["https:", "http:"].includes(url.protocol) ? url.origin : `https://${host}`;
    } catch { return null; }
  }
  if (!host) return null;
  const parsed = parseRepository(`${host}/${pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "")}`);
  return parsed ? { ...parsed, url: `${origin}/${parsed.full_name}` } : null;
}

export function ghRepository(repository) {
  const fullName = repository.full_name ?? `${repository.owner}/${repository.repository}`;
  return repository.host ? `${repository.host}/${fullName}` : fullName;
}

export function repositoryApiArgs(repository, suffix, ...options) {
  const parsed = typeof repository === "string" ? parseRepository(repository) : repository;
  if (!parsed) throw new Error("Repository must use [host/]owner/repo");
  return ["api", "--method", "GET", `repos/${parsed.full_name}/${suffix}`,
    ...(parsed.host ? ["--hostname", parsed.host] : []), ...options];
}

export function matchesIssueUrl(value, repository, number, commentId = null) {
  const parsed = parseRepository(repository);
  if (!parsed || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      && (!parsed.host || url.host.toLowerCase() === parsed.host)
      && url.pathname === `/${parsed.full_name}/issues/${number}` && !url.search
      && url.hash === (commentId === null ? "" : `#issuecomment-${commentId}`);
  } catch { return false; }
}

export function findIssueUrl(output, repository) {
  for (const value of String(output ?? "").match(/https?:\/\/[^\s<>"']+/g) ?? []) {
    const number = Number(value.match(/\/issues\/([1-9]\d*)$/)?.[1]);
    if (Number.isSafeInteger(number) && matchesIssueUrl(value, repository, number)) return value;
  }
  return "";
}

export function repositoryCacheParts(value) {
  const parsed = parseRepository(value);
  if (!parsed) throw new Error("Repository must use [host/]owner/repo");
  return [...(parsed.host && parsed.host !== "github.com" ? [encodeURIComponent(parsed.host)] : []),
    parsed.owner, parsed.repository];
}
