import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture } from "./sync-fixture.mjs";
import { renderHumanOutput } from "../scripts/miku-scm-human-output.mjs";

const RUNNER = fileURLToPath(new URL("../scripts/miku-scm-run.mjs", import.meta.url));

test("sync push stop reports publication state and the command the user can run", () => {
  const output = renderHumanOutput({ workflow: "repository.sync.push.prepare", status: "not-applied", approvalGate: "apply", delegateStatus: "not-applied", mutationInvoked: false,
    result: { status: "not-applied", publication_state: "not-started", reason: "Base advanced", next_command: "miku-scm sync pull", next_action: "Local work is retained. Run sync pull, then sync push." } });
  assert.match(output, /^Push state: not-started$/m);
  assert.match(output, /^Next command: miku-scm sync pull$/m);
  assert.match(output, /Local work is retained/);
});

function cli(cwd, format, workflow, args) {
  const result = spawnSync(process.execPath, [RUNNER, "--format", format, workflow, ...args], {
    cwd, encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  return result;
}

for (const format of ["human", "json"]) test(`sync push ${format} CLI retrieves exact saved evidence and publishes once`, async (t) => {
  const f = await fixture(t);
  // The caller can differ from --repo; an absolute result path must stay usable.
  const caller = path.join(f.directory, "CLI caller with spaces");
  await mkdir(caller);
  await f.write("own.txt", "requested work\n");
  const base = f.git(["rev-parse", "HEAD"]);
  const branch = f.git(["branch", "--show-current"]);
  const prepareArgs = ["--repo", f.repo, "--base", "devel", "--message", "Implement requested work", "--apply"];
  const prepared = cli(caller, format, "repository.sync.push.prepare", prepareArgs);
  assert.equal(prepared.status, 0, prepared.stdout + prepared.stderr);

  let resultFile;
  let operation;
  if (format === "human") {
    resultFile = prepared.stdout.match(/^Result file: (.+)$/m)?.[1];
    operation = prepared.stdout.match(/^Operation: (.+)$/m)?.[1];
    assert.match(prepared.stdout, /read result\.evidence from the saved result file/);
  } else {
    const stdout = JSON.parse(prepared.stdout);
    resultFile = path.resolve(caller, stdout.run_directory, "result.json");
    operation = stdout.result.operation_id;
  }
  assert.ok(resultFile, prepared.stdout);
  assert.ok(path.isAbsolute(resultFile));
  assert.ok(operation, prepared.stdout);
  const savedBytes = await readFile(resultFile, "utf8");
  const saved = JSON.parse(savedBytes);
  const runnerPlan = JSON.parse(await readFile(path.join(path.dirname(resultFile), "plan.json"), "utf8"));
  assert.equal(saved.workflow, "repository.sync.push.prepare");
  assert.equal(runnerPlan.workflow, saved.workflow);
  assert.equal(runnerPlan.run_id, saved.run_id);
  assert.equal(await realpath(runnerPlan.repository), await realpath(f.repo));
  const p = saved.result;
  assert.equal(p.status, "prepared");
  assert.equal(p.operation_id, operation);
  assert.match(p.plan_sha256, /^[a-f0-9]{64}$/);
  assert.equal(p.head, f.git(["rev-parse", "HEAD"]));
  assert.equal(p.evidence.head, p.head);
  assert.ok(p.evidence.writing_contract);
  assert.equal(p.evidence.suggested_draft_path, p.suggested_draft_path);
  assert.equal(p.commit.status, "created");
  assert.equal(f.git(["rev-list", "--count", `${base}..HEAD`]), "1");
  const stateFile = path.join(f.repo, "workplace/miku-scm/sync/operations", operation, "state.json");
  const preparedState = await readFile(stateFile, "utf8");
  assert.equal(JSON.parse(preparedState).status, "prepared");
  assert.ok(!JSON.parse(preparedState).apply_started);

  // A file read needs no resume and does not create another ordinary commit.
  assert.equal(await readFile(resultFile, "utf8"), savedBytes);
  assert.equal(await readFile(stateFile, "utf8"), preparedState);
  assert.equal(f.git(["rev-parse", "HEAD"]), p.head);

  // Repeating the user's command returns the exact preparation without another commit.
  const duplicate = cli(caller, "json", "repository.sync.push.prepare", prepareArgs);
  assert.equal(duplicate.status, 0, duplicate.stdout + duplicate.stderr);
  const continued = JSON.parse(duplicate.stdout).result;
  assert.equal(continued.status, "prepared");
  assert.equal(continued.operation_id, operation);
  assert.equal(continued.plan_sha256, p.plan_sha256);
  assert.equal(continued.continuation, "resumed-preparation");
  assert.equal(continued.mutation_invoked, false);
  assert.equal(await readFile(stateFile, "utf8"), preparedState);
  assert.equal(await readFile(resultFile, "utf8"), savedBytes);
  assert.equal(f.git(["rev-parse", "HEAD"]), p.head);

  const prose = "Implement requested work\n\nPreserve the requested content.\n";
  await f.write(p.suggested_draft_path, prose);
  const beforeDraftPrepare = await readFile(stateFile, "utf8");
  const draftPrepared = cli(caller, "json", "repository.sync.push.draft.prepare", ["--repo", f.repo,
    "--operation", operation, "--expected-plan-sha256", p.plan_sha256]);
  assert.equal(draftPrepared.status, 0, draftPrepared.stdout + draftPrepared.stderr);
  const draftResult = JSON.parse(draftPrepared.stdout).result;
  assert.equal(draftResult.status, "draft-ready");
  assert.equal(draftResult.workflow_id, "repository.sync.push.apply");
  assert.equal(draftResult.draft_path, p.suggested_draft_path);
  assert.equal(draftResult.draft_sha256, createHash("sha256").update(prose).digest("hex"));
  assert.deepEqual(draftResult.apply_arguments, ["--repo", await realpath(f.repo), "--operation", operation,
    "--expected-plan-sha256", p.plan_sha256, "--pr-draft", p.suggested_draft_path,
    "--expected-draft-sha256", draftResult.draft_sha256, "--apply"]);
  assert.equal(await readFile(stateFile, "utf8"), beforeDraftPrepare);
  assert.equal(f.git(["rev-parse", "HEAD"]), p.head);

  const published = cli(caller, "human", draftResult.workflow_id, draftResult.apply_arguments);
  assert.equal(published.status, 0, published.stdout + published.stderr);
  assert.match(published.stdout, /Result: published/);
  assert.equal(f.git(["branch", "--show-current"]), `${branch}-done`);
  assert.equal(f.git(["rev-list", "--count", `${base}..HEAD`]), "1");
  assert.equal(f.git(["rev-list", "--left-right", "--count", `HEAD...origin/${branch}`]).replace(/\s+/g, " "), "0 0");
  const publishedHead = f.git(["rev-parse", "HEAD"]);
  assert.equal(f.git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]).split(/\s+/)[0], publishedHead);
  const completedState = await readFile(stateFile, "utf8");
  assert.equal(JSON.parse(completedState).status, "completed");

  const repeatedApply = cli(caller, "json", "repository.sync.push.apply", draftResult.apply_arguments);
  assert.equal(repeatedApply.status, 1, repeatedApply.stdout + repeatedApply.stderr);
  assert.equal(JSON.parse(repeatedApply.stdout).result.status, "not-applied");
  assert.equal(await readFile(stateFile, "utf8"), completedState);
  assert.equal(f.git(["rev-parse", "HEAD"]), publishedHead);
  assert.equal(f.git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]).split(/\s+/)[0], publishedHead);
  const consumedDraftPrepare = cli(caller, "json", "repository.sync.push.draft.prepare", ["--repo", f.repo,
    "--operation", operation, "--expected-plan-sha256", p.plan_sha256]);
  assert.equal(consumedDraftPrepare.status, 1);
  assert.match(JSON.parse(consumedDraftPrepare.stdout).error.message, /unused prepared operation/);
});
