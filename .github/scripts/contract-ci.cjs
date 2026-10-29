// Shared by the two PR contract workflows. API failures fail the selection job.
const skills = new Set(['igapyon-miku-scm', 'igapyon-github-writer']);
const shared = new Set([
  'package.json', 'pom.xml', 'scripts/contract-ci.test.mjs',
  'skills/igapyon-mikuku-agent/references/VERSION.md',
  'skills/igapyon-miku-scm/scripts/miku-scm-run.mjs',
  'skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs',
]);

function requiresTests(skill, files, expectedCount) {
  if (!skills.has(skill)) throw new Error('Unknown contract skill');
  if (!Array.isArray(files) || files.some((file) => typeof file.filename !== 'string')) {
    throw new Error('Malformed changed-file evidence');
  }
  // GitHub caps the files API at 3,000 entries. Incomplete evidence runs tests.
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== files.length) return true;
  return files.some((file) => [file.filename, file.previous_filename].filter(Boolean).some((name) =>
    shared.has(name) || name.startsWith('.github/')
    || name.startsWith('scripts/validate-version-alignment.')
    || name.startsWith(`skills/${skill}/`)));
}

async function select({ github, context, core }, skill) {
  if (context.eventName === 'workflow_dispatch') {
    core.setOutput('required', 'true');
    return;
  }
  if (context.eventName !== 'pull_request') throw new Error('Unsupported contract event');
  const pull_number = context.payload.pull_request.number;
  const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number });
  const matchesEvent = (value) => value.head.sha === context.payload.pull_request.head.sha
    && value.base.sha === context.payload.pull_request.base.sha;
  if (!matchesEvent(pr)) throw new Error('PR changed during selection; use its newest run');
  const files = await github.paginate(github.rest.pulls.listFiles, { ...context.repo, pull_number, per_page: 100 });
  const { data: after } = await github.rest.pulls.get({ ...context.repo, pull_number });
  if (!matchesEvent(after) || after.changed_files !== pr.changed_files) throw new Error('PR changed during selection; use its newest run');
  core.setOutput('required', String(requiresTests(skill, files, pr.changed_files)));
}

function assertGate(needs) {
  if (needs.select.result !== 'success') throw new Error('Change selection did not succeed');
  const required = needs.select.outputs.required;
  if (required === 'true' && needs.contract.result === 'success') return;
  if (required === 'false' && needs.contract.result === 'skipped') return;
  throw new Error(`Contract checks did not succeed: required=${required}, result=${needs.contract.result}`);
}

module.exports = { requiresTests, select, assertGate };
