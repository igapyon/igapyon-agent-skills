import assert from 'node:assert/strict';
import test from 'node:test';
import helpers from '../.github/scripts/contract-ci.cjs';
const { requiresTests, assertGate, select } = helpers;

test('selection covers renames, shared versions and incomplete evidence', () => {
  assert.equal(requiresTests('igapyon-miku-scm', [{ filename: 'README.md' }], 1), false);
  assert.equal(requiresTests('igapyon-miku-scm', [{ filename: 'README.md' }], 3001), true);
  assert.equal(requiresTests('igapyon-miku-scm', [{ filename: 'archived.mjs', previous_filename: 'skills/igapyon-miku-scm/scripts/old.mjs' }], 1), true);
  for (const skill of ['igapyon-miku-scm', 'igapyon-github-writer']) {
    assert.equal(requiresTests(skill, [{ filename: 'pom.xml' }], 1), true);
    assert.equal(requiresTests(skill, [{ filename: '.github/scripts/contract-ci.cjs' }], 1), true);
  }
  assert.throws(() => requiresTests('unknown', [], 0));
});

test('required check succeeds only on explicit not-needed or successful tests', () => {
  const needs = (required, result, selection = 'success') => ({ select: { result: selection, outputs: { required } }, contract: { result } });
  assert.doesNotThrow(() => assertGate(needs('false', 'skipped')));
  assert.doesNotThrow(() => assertGate(needs('true', 'success')));
  for (const result of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    assert.throws(() => assertGate(needs('true', result)));
  }
  for (const selection of ['failure', 'cancelled', 'skipped']) {
    assert.throws(() => assertGate(needs('false', 'skipped', selection)));
  }
  assert.throws(() => assertGate(needs(undefined, 'skipped')));
  assert.throws(() => assertGate(needs('false', 'failure')));
});

test('selection uses complete PR file evidence and refuses a changed PR', async () => {
  const outputs = [];
  const input = {
    context: { eventName: 'pull_request', repo: { owner: 'owner', repo: 'repo' }, payload: { pull_request: { number: 1, head: { sha: 'original' }, base: { sha: 'base' } } } },
    core: { setOutput: (...args) => outputs.push(args) },
    github: {
      rest: { pulls: { get: async () => ({ data: { head: { sha: 'original' }, base: { sha: 'base' }, changed_files: 1 } }), listFiles: 'files' } },
      paginate: async (endpoint, args) => { assert.equal(endpoint, 'files'); assert.equal(args.pull_number, 1); return [{ filename: 'README.md' }]; },
    },
  };
  await select(input, 'igapyon-miku-scm');
  assert.deepEqual(outputs, [['required', 'false']]);
  input.github.rest.pulls.get = async () => ({ data: { head: { sha: 'changed' } } });
  await assert.rejects(select(input, 'igapyon-miku-scm'), /PR changed/);
  assert.equal(outputs.length, 1);
  let reads = 0;
  input.github.rest.pulls.get = async () => ({ data: { head: { sha: 'original' }, base: { sha: reads++ ? 'moved' : 'base' }, changed_files: 1 } });
  await assert.rejects(select(input, 'igapyon-miku-scm'), /PR changed/);
  assert.equal(outputs.length, 1);
  input.github.rest.pulls.get = async () => { throw new Error('API unavailable'); };
  await assert.rejects(select(input, 'igapyon-miku-scm'), /API unavailable/);
  input.context.eventName = 'workflow_dispatch';
  await select(input, 'igapyon-miku-scm');
  assert.deepEqual(outputs.at(-1), ['required', 'true']);
});
