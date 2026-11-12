import assert from 'node:assert/strict';
import test from 'node:test';
import helpers from '../.github/scripts/contract-ci.cjs';

const { strictVersionValue, changeMode, assertGate, select } = helpers;
const skills = ['igapyon-miku-scm', 'igapyon-github-writer'];
const files = {
  pom: 'pom.xml',
  mikuku: 'skills/igapyon-mikuku-agent/references/VERSION.md',
  miku: 'skills/igapyon-miku-scm/scripts/miku-scm-run.mjs',
  writer: 'skills/igapyon-github-writer/scripts/github-writer-workflow-manifest.mjs',
};

function versionTexts(number = '4', suffix = 'd') {
  return new Map([
    [files.pom, `<project>\n  <modelVersion>4.0.0</modelVersion>\n  <version>1.20261112.${number}</version>\n  <build><plugins><plugin><version>9.0.0</version></plugin></plugins></build>\n</project>\n`],
    [files.mikuku, `# Version\n\nVersion: 20261112${suffix}\n\nRelease process description.\n`],
    [files.miku, `export const PRODUCT_VERSION = "1.20261112.${number}";\nexport function run() {}\n`],
    [files.writer, `export const PRODUCT_VERSION = "1.20261112.${number}";\nexport function write() {}\n`],
  ]);
}

function changed(paths) {
  return paths.map((filename) => ({ filename, status: 'modified' }));
}

function blobs(base = versionTexts('3', 'c'), head = versionTexts()) {
  return new Map([...base].flatMap(([file, text]) => [[`base:${file}`, text], [`head:${file}`, head.get(file)]]));
}

function apiForContent(content, { failAt, pulls = [] } = {}) {
  let pullIndex = 0;
  return {
    github: {
      rest: {
        repos: { getContent: async ({ path, ref }) => {
          if (`${ref}:${path}` === failAt) throw new Error('contents API unavailable');
          const text = content.get(`${ref}:${path}`);
          if (text === undefined) throw new Error(`missing blob ${ref}:${path}`);
          return { data: { type: 'file', encoding: 'base64', content: Buffer.from(text).toString('base64') } };
        } },
        pulls: { get: async () => ({ data: pulls[pullIndex++] ?? pulls.at(-1) }), listFiles: 'files' },
      },
    },
    pullCalls: () => pullIndex,
  };
}

for (const skill of skills) test(`${skill} selector uses strict version-only evidence and safe fallbacks`, async () => {
  const fake = apiForContent(blobs());
  assert.equal(await changeMode({ ...fake, repo: { owner: 'owner', repo: 'repo' }, files: changed(Object.values(files)),
    expectedCount: 4, baseSha: 'base', headSha: 'head', skill }), 'versions');

  const mixed = versionTexts();
  mixed.set(files.miku, `${mixed.get(files.miku)}// implementation change\n`);
  assert.equal(await changeMode({ ...apiForContent(blobs(versionTexts('3', 'c'), mixed)), repo: {}, files: changed([files.miku]),
    expectedCount: 1, baseSha: 'base', headSha: 'head', skill }), 'full');

  const plugin = versionTexts();
  plugin.set(files.pom, plugin.get(files.pom).replace('<plugin><version>9.0.0</version></plugin>', '<plugin><version>9.1.0</version></plugin>'));
  const pluginBase = versionTexts('3', 'c');
  assert.equal(await changeMode({ ...apiForContent(blobs(pluginBase, plugin)), repo: {}, files: changed([files.pom]),
    expectedCount: 1, baseSha: 'base', headSha: 'head', skill }), 'full');

  const prose = versionTexts();
  prose.set(files.mikuku, `${prose.get(files.mikuku)}New explanatory text.\n`);
  const proseBase = versionTexts('3', 'c');
  assert.equal(await changeMode({ ...apiForContent(blobs(proseBase, prose)), repo: {}, files: changed([files.mikuku]),
    expectedCount: 1, baseSha: 'base', headSha: 'head', skill }), 'full');

  assert.equal(await changeMode({ ...fake, repo: {}, files: [{ filename: files.miku, previous_filename: 'skills/igapyon-miku-scm/scripts/old.mjs', status: 'renamed' }],
    expectedCount: 1, baseSha: 'base', headSha: 'head', skill }), 'full');
  for (const malformed of [
    (text) => text.replace(/^export const PRODUCT_VERSION.*\n/m, ''),
    (text) => `${text}export const PRODUCT_VERSION = "1.20261112.4";\n`,
  ]) {
    const head = versionTexts();
    head.set(files.miku, malformed(head.get(files.miku)));
    assert.equal(await changeMode({ ...apiForContent(blobs(versionTexts('3', 'c'), head)), repo: {}, files: changed([files.miku]),
      expectedCount: 1, baseSha: 'base', headSha: 'head', skill }), 'full');
  }

  const mismatched = versionTexts();
  mismatched.set(files.writer, mismatched.get(files.writer).replace('1.20261112.4', '1.20261112.3'));
  assert.equal(await changeMode({ ...apiForContent(blobs(versionTexts('3', 'c'), mismatched)), repo: {}, files: changed(Object.values(files)),
    expectedCount: 4, baseSha: 'base', headSha: 'head', skill }), 'full');
  assert.equal(await changeMode({ ...apiForContent(blobs(), { failAt: `head:${files.writer}` }), repo: {}, files: changed(Object.values(files)),
    expectedCount: 4, baseSha: 'base', headSha: 'head', skill }), 'full');

  assert.equal(await changeMode({ github: fake.github, repo: {}, files: [{ filename: 'README.md' }], expectedCount: 2,
    baseSha: 'base', headSha: 'head', skill }), 'full');
  assert.equal(await changeMode({ github: fake.github, repo: {}, files: changed(['.github/workflows/release-archive.yml']), expectedCount: 1,
    baseSha: 'base', headSha: 'head', skill }), 'none');
  assert.equal(await changeMode({ github: fake.github, repo: {}, files: changed(['.github/workflows/unknown.yml']), expectedCount: 1,
    baseSha: 'base', headSha: 'head', skill }), 'full');
});

test('one aligned version source can be the only changed file', async () => {
  const base = versionTexts();
  base.set(files.pom, base.get(files.pom).replace('1.20261112.4', '1.20261112.3'));
  const content = blobs(base, versionTexts());
  assert.equal(await changeMode({ ...apiForContent(content), repo: {}, files: changed([files.pom]), expectedCount: 1,
    baseSha: 'base', headSha: 'head', skill: 'igapyon-miku-scm' }), 'versions');
});

test('strict replacements require exactly one version literal and preserve every other byte', () => {
  const source = 'prefix\nexport const PRODUCT_VERSION = "1.20261112.4";\nsuffix\n';
  const result = strictVersionValue(files.miku, source);
  assert.equal(result.version, '1.20261112.4');
  assert.equal(result.normalized, 'prefix\nexport const PRODUCT_VERSION = "<VERSION>";\nsuffix\n');
  assert.throws(() => strictVersionValue(files.miku, `${source}${source}`), /one version literal/);
});

test('required gate enforces none, versions, and full job success and failure propagation', () => {
  const needs = (mode, contract, versions, selection = 'success') => ({
    select: { result: selection, outputs: { mode, required: String(mode !== 'none') } },
    contract: { result: contract }, versions: { result: versions },
  });
  assert.doesNotThrow(() => assertGate(needs('none', 'skipped', 'skipped')));
  assert.doesNotThrow(() => assertGate(needs('versions', 'skipped', 'success')));
  assert.doesNotThrow(() => assertGate(needs('full', 'success', 'skipped')));
  for (const result of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    assert.throws(() => assertGate(needs('versions', 'skipped', result)));
    assert.throws(() => assertGate(needs('full', result, 'skipped')));
  }
  assert.throws(() => assertGate(needs('none', 'success', 'skipped')));
  assert.throws(() => assertGate(needs('versions', 'success', 'success')));
  assert.throws(() => assertGate(needs('full', 'success', 'success')));
  assert.throws(() => assertGate(needs('none', 'skipped', 'skipped', 'failure')));
  assert.throws(() => assertGate(needs('invalid', 'skipped', 'skipped')));
});

test('selection pins complete file and blob evidence to unchanged PR base and head', async () => {
  const outputs = [];
  const content = blobs();
  const pr = { head: { sha: 'head' }, base: { sha: 'base' }, changed_files: 4 };
  const api = apiForContent(content, { pulls: [pr, pr] });
  api.github.paginate = async (endpoint, args) => {
    assert.equal(endpoint, 'files');
    assert.equal(args.pull_number, 1);
    assert.equal(args.per_page, 100);
    return changed(Object.values(files));
  };
  await select({ context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'head' }, base: { sha: 'base' } } } },
    core: { setOutput: (...args) => outputs.push(args) }, github: api.github }, 'igapyon-miku-scm');
  assert.deepEqual(outputs, [['required', 'true'], ['mode', 'versions']]);
  assert.equal(api.pullCalls(), 2);

  const moved = apiForContent(content, { pulls: [pr, { ...pr, head: { sha: 'moved' } }] });
  moved.github.paginate = async () => changed(Object.values(files));
  await assert.rejects(select({ context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'head' }, base: { sha: 'base' } } } },
    core: { setOutput() {} }, github: moved.github }, 'igapyon-github-writer'), /PR changed/);
  const movedBase = apiForContent(content, { pulls: [pr, { ...pr, base: { sha: 'moved-base' } }] });
  movedBase.github.paginate = async () => changed(Object.values(files));
  await assert.rejects(select({ context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'head' }, base: { sha: 'base' } } } },
    core: { setOutput() {} }, github: movedBase.github }, 'igapyon-miku-scm'), /PR changed/);

  const incomplete = apiForContent(content, { pulls: [pr, pr] });
  incomplete.github.paginate = async () => changed([files.pom]);
  const incompleteOutputs = [];
  await select({ context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'head' }, base: { sha: 'base' } } } },
    core: { setOutput: (...args) => incompleteOutputs.push(args) }, github: incomplete.github }, 'igapyon-github-writer');
  assert.deepEqual(incompleteOutputs, [['required', 'true'], ['mode', 'full']]);

  const apiFailure = { ...api.github, rest: { ...api.github.rest, pulls: { get: async () => { throw new Error('API unavailable'); } } } };
  await assert.rejects(select({ context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'head' }, base: { sha: 'base' } } } },
    core: { setOutput() {} }, github: apiFailure }, 'igapyon-github-writer'), /API unavailable/);

  const dispatch = [];
  await select({ context: { eventName: 'workflow_dispatch' }, core: { setOutput: (...args) => dispatch.push(args) } }, 'igapyon-miku-scm');
  assert.deepEqual(dispatch, [['required', 'true'], ['mode', 'full']]);
});
