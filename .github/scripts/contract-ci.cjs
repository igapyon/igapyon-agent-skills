// Shared by the two PR contract workflows. Selection evidence is pinned to PR SHAs.
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const skills = new Set(['igapyon-miku-scm', 'igapyon-github-writer']);
const versionSources = new Set([
  'pom.xml',
  'skills/igapyon-mikuku-agent/references/VERSION.md',
  'skills/igapyon-miku-scm/scripts/miku-scm-run.mjs',
  'skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs',
]);
const shared = new Set([
  'package.json', 'scripts/contract-ci.test.mjs', 'scripts/validate-version-alignment.mjs',
  ...versionSources,
]);
const contractWorkflows = new Set([
  '.github/workflows/miku-scm-contract.yml',
  '.github/workflows/github-writer-contract.yml',
]);
const independentGithubFiles = new Set([
  '.github/workflows/daybook-runtime-contract.yml',
  '.github/workflows/release-archive.yml',
  '.github/workflows/github-writer-benchmark.yml',
]);

function isVersionCandidate(files, expectedCount) {
  return Number.isSafeInteger(expectedCount) && expectedCount === files.length && files.length > 0
    && files.every((file) => versionSources.has(file.filename) && !file.previous_filename && file.status === 'modified');
}

function changedRequiresFull(skill, files, expectedCount) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== files.length) return true;
  return files.some((file) => [file.filename, file.previous_filename].filter(Boolean).some((name) =>
    versionSources.has(name) || shared.has(name) || contractWorkflows.has(name)
    || (name.startsWith('.github/') && !independentGithubFiles.has(name)) || name.startsWith(`skills/${skill}/`)));
}

function strictVersionValue(file, text) {
  let expression;
  if (file === 'pom.xml') expression = /^([ ]{2}<version>)([^<\r\n]+)(<\/version>[\t ]*\r?)$/gm;
  else if (file.endsWith('/VERSION.md')) expression = /^(Version: )([^\s\r\n]+)(\r?)$/gm;
  else expression = /^(export const PRODUCT_VERSION = ")([^"\r\n]+)(";\r?)$/gm;
  const matches = [...text.matchAll(expression)];
  if (matches.length !== 1) throw new Error(`Expected one version literal in ${file}`);
  const version = matches[0][2];
  if (file === 'pom.xml' && !/^1\.\d{8}\.[1-9]\d*$/.test(version)) throw new Error('Invalid project.version');
  if (file.endsWith('/VERSION.md') && !/^\d{8}[a-z]+$/.test(version)) throw new Error('Invalid VERSION.md value');
  if (!file.endsWith('/VERSION.md') && file !== 'pom.xml' && !/^1\.\d{8}\.[1-9]\d*$/.test(version)) throw new Error(`Invalid product version in ${file}`);
  const match = matches[0];
  const normalized = text.slice(0, match.index) + `${match[1]}<VERSION>${match[3]}` + text.slice(match.index + match[0].length);
  return { version, normalized };
}

function decodeContent(data, file) {
  if (!data || data.type !== 'file' || data.encoding !== 'base64' || typeof data.content !== 'string') {
    throw new Error(`Cannot read complete text blob: ${file}`);
  }
  const encoded = data.content.replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded) throw new Error(`Malformed base64 text blob: ${file}`);
  return new (require('node:util').TextDecoder)('utf-8', { fatal: true }).decode(bytes);
}

async function readAt(github, repo, file, ref) {
  const { data } = await github.rest.repos.getContent({ ...repo, path: file, ref });
  return decodeContent(data, file);
}

async function provesVersionOnly({ github, repo, files, baseSha, headSha }) {
  try {
    const headTexts = new Map();
    await Promise.all([...versionSources].map(async (file) => headTexts.set(file, await readAt(github, repo, file, headSha))));
    const parsedHead = new Map([...versionSources].map((file) => [file, strictVersionValue(file, headTexts.get(file))]));
    for (const file of files) {
      const before = strictVersionValue(file.filename, await readAt(github, repo, file.filename, baseSha));
      const after = parsedHead.get(file.filename);
      if (before.normalized !== after.normalized) return false;
    }
    const validatorUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'validate-version-alignment.mjs')).href;
    const { assertVersionAlignment } = await import(validatorUrl);
    const pom = strictVersionValue('pom.xml', headTexts.get('pom.xml')).version;
    assertVersionAlignment({
      projectVersion: pom,
      mikukuText: headTexts.get('skills/igapyon-mikuku-agent/references/VERSION.md'),
      runnerText: headTexts.get('skills/igapyon-miku-scm/scripts/miku-scm-run.mjs'),
      githubWriterText: headTexts.get('skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs'),
    });
    return true;
  } catch {
    // Incomplete, malformed, or unavailable content is never treated as version-only.
    return false;
  }
}

async function changeMode({ github, repo, files, expectedCount, baseSha, headSha, skill }) {
  if (!skills.has(skill)) throw new Error('Unknown contract skill');
  if (!Array.isArray(files) || files.some((file) => typeof file.filename !== 'string')) throw new Error('Malformed changed-file evidence');
  if (isVersionCandidate(files, expectedCount)
    && await provesVersionOnly({ github, repo, files, baseSha, headSha })) return 'versions';
  return changedRequiresFull(skill, files, expectedCount) ? 'full' : 'none';
}

async function select({ github, context, core }, skill) {
  if (context.eventName === 'workflow_dispatch') {
    core.setOutput('required', 'true');
    core.setOutput('mode', 'full');
    return;
  }
  if (context.eventName !== 'pull_request') throw new Error('Unsupported contract event');
  const pull_number = context.payload.pull_request.number;
  const expectedHead = context.payload.pull_request.head.sha;
  const expectedBase = context.payload.pull_request.base.sha;
  const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number });
  const matchesEvent = (value) => value.head.sha === expectedHead && value.base.sha === expectedBase;
  if (!matchesEvent(pr)) throw new Error('PR changed during selection; use its newest run');
  const files = await github.paginate(github.rest.pulls.listFiles, { ...context.repo, pull_number, per_page: 100 });
  const mode = await changeMode({ github, repo: context.repo, files, expectedCount: pr.changed_files,
    baseSha: expectedBase, headSha: expectedHead, skill });
  const { data: after } = await github.rest.pulls.get({ ...context.repo, pull_number });
  if (!matchesEvent(after) || after.changed_files !== pr.changed_files) throw new Error('PR changed during selection; use its newest run');
  core.setOutput('required', String(mode !== 'none'));
  core.setOutput('mode', mode);
}

function assertGate(needs) {
  if (needs.select.result !== 'success') throw new Error('Change selection did not succeed');
  const { required, mode } = needs.select.outputs;
  if (mode === 'none' && required === 'false' && needs.contract.result === 'skipped' && needs.versions.result === 'skipped') return;
  if (mode === 'versions' && required === 'true' && needs.contract.result === 'skipped' && needs.versions.result === 'success') return;
  if (mode === 'full' && required === 'true' && needs.contract.result === 'success' && needs.versions.result === 'skipped') return;
  throw new Error(`Contract checks did not succeed: required=${required}, mode=${mode}, contract=${needs.contract.result}, versions=${needs.versions.result}`);
}

module.exports = { isVersionCandidate, strictVersionValue, changeMode, select, assertGate };
