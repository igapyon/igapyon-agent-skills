# Public URL and Link Review

Use this reference to review whether README, documentation, release notes,
articles, examples, generated files, and repository metadata contain valid and
appropriate public links.

This is the URL equivalent of absolute-path leakage review. It checks broken
links, localhost links, private URLs, internal hosts, temporary URLs, and links
that do not match the intended publication surface.

It also checks whether primary-source and official-reference URLs point to the
real provider, project, standards body, or documentation site rather than to a
lookalike, unofficial mirror, stale copy, or suspicious domain.

## Review Priority

Use this review before publication, release, commit, package publication, or
GitHub repository readiness review when Markdown, HTML, generated docs, or
release text contains links.

## Core Checks

Look for:

- broken or malformed URLs
- `localhost`, `127.0.0.1`, `0.0.0.0`, LAN IPs, or local development ports
- private network hosts, internal domains, VPN-only URLs, staging URLs, or
  temporary preview URLs
- signed URLs, expiring URLs, tokens in query strings, or private download links
- absolute local file URLs such as `file:///...`
- links to local workspace paths, generated preview servers, or machine-specific
  locations
- repository links that point to the wrong branch, tag, file, or old project
  name
- release links that point to an old version or draft-only asset
- badges that reference old repository names, old workflow names, or private
  resources
- Markdown links whose label promises one target but points somewhere else
- primary-source labels such as "official", "documentation", "provider",
  "upstream", or "source" pointing to unofficial, suspicious, or mismatched
  domains
- domains that appear to imitate a provider, project, package registry,
  standards body, or GitHub repository

## Public Readiness Checks

For public README or docs, check:

- important links are reachable or intentionally relative
- links to GitHub files use stable branches, tags, or relative paths as
  appropriate
- release download links point to the intended release page or asset role
- documentation does not require access to a local dev server
- screenshots, images, and badges render from public or repository-local paths
- external references are relevant, trustworthy, and not unnecessarily broad
- support, issue, and contribution links point to the intended repository

Do not require every link to be external. Relative links within the repository
are often better for docs that move across branches or forks.

## Primary Source URL Checks

When a document links to official documentation, upstream repositories,
standards, package registries, licenses, downloads, or provider pages, check
whether the URL appears to be the correct primary source.

Check:

- link label and URL domain agree, such as an "official Node.js documentation"
  link going to the expected Node.js project domain rather than an unrelated
  tutorial site
- organization, product, package, and repository names in the URL match the
  surrounding text
- GitHub repository links point to the expected owner and repository, not a fork
  or similarly named project unless that is intentional
- package registry links point to the expected package name and namespace
- license links point to the official license text or a trusted copy associated
  with the project
- standards or specification links point to the maintaining standards body or
  project site when a primary source is intended
- download links point to the official release page, package registry, or
  documented distribution channel
- redirects, URL shorteners, tracking links, affiliate links, or opaque download
  URLs are avoided for primary-source references when a clear official URL is
  available

Flag risks when:

- an official-source label points to a blog, mirror, scraper, AI-generated
  article, ad-heavy site, or unofficial tutorial
- the domain contains misspellings, extra words, unusual TLDs, or lookalike
  characters that could indicate phishing or brand impersonation
- the URL path suggests a different product, organization, version, or license
  than the visible link text
- a copied link points to a now-unmaintained, archived, deprecated, or moved
  official source without noting the status
- the link could cause users to download tools, installers, jars, scripts, or
  archives from a non-primary source without explanation

When official URL correctness matters and cannot be verified from local
context, report it as "verify primary source URL" rather than guessing. If the
user explicitly asks for verification and network access is available, use
official provider or project sources first.

## Private URL Checks

Flag URLs that may leak private context:

- internal company or home network hostnames
- local service dashboards
- personal cloud storage links
- unpublished draft links
- authenticated app URLs
- temporary object storage URLs
- URLs containing access tokens, session IDs, API keys, or email addresses
- screenshots or docs that reveal private URLs in visible text

If a private URL is intentional, the document should clearly be internal-only
or the link should be replaced with a placeholder.

## Severity Guidance

Use these severity levels:

- Critical: URL exposes a credential, signed private resource, session token, or
  private data.
- High: public docs or release artifacts contain localhost, private network,
  internal, file, or temporary URLs that users cannot access or should not see.
- High: a link presented as official or primary source points to a suspicious,
  lookalike, or likely phishing domain.
- High: public docs direct users to download executable artifacts, scripts, or
  packages from a non-primary source without explanation.
- Medium: important README, docs, release, badge, image, or download links are
  broken, stale, or point to old project/version targets.
- Medium: primary-source URLs are unverifiable, indirect, shortened, mirrored,
  or mismatched with the link label.
- Low: minor link label mismatch, non-critical stale reference, or relative link
  polish issue.

## Review Output

Use this format when public URLs or links are in scope:

```text
Public URL and Link Review

Public link readiness: ready / partial / risky / not checked
Primary-source URL readiness: ready / partial / risky / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

When no material issue is visible:

```text
Public URL and Link Review

No obvious broken, private, localhost, token-bearing, or stale public-link issue
is visible from the reviewed material.
```

Do not fetch private URLs or perform network checks during review mode unless
the user explicitly asks for link verification and the environment permits it.
