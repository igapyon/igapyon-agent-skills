import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const runner = fileURLToPath(new URL("../scripts/github-writer-run.mjs", import.meta.url));
const errorReporter = fileURLToPath(new URL("../scripts/github-writer-error-report.mjs", import.meta.url));

function invokeScript(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
}

function invoke(args) {
  return invokeScript(runner, args);
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "github-writer-cli-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.name", "GitHub Writer Test"]);
  git(root, ["config", "user.email", "github-writer@example.invalid"]);
  writeFileSync(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  writeFileSync(path.join(root, "README.md"), "# Test\n", "utf8");
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "Initial"]);
  return root;
}

test("CLI returns a versioned JSON envelope and run artifacts", (t) => {
  const root = fixture(t);
  const result = invoke(["--format", "json", "branch.status", "--repo", root]);
  assert.equal(result.status, 0, result.stderr);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.schema_version, "github-writer.runner-result/v1");
  assert.equal(envelope.workflow, "branch.status");
  assert.equal(envelope.workflow_contract, "branch.status");
  assert.equal(envelope.contract_version, 2);
  assert.match(envelope.contract_pair_sha256, /^[0-9a-f]{64}$/);
  assert.equal(envelope.status, "success");
  assert.equal(envelope.mutation_invoked, false);
  assert.equal(envelope.run_artifacts.schema_version, "github-writer.run-record/v1");
  assert.equal(existsSync(path.join(root, envelope.run_artifacts.request)), true);
  assert.equal(existsSync(path.join(root, envelope.run_artifacts.result)), true);
  const request = readFileSync(path.join(root, envelope.run_artifacts.request), "utf8");
  assert.doesNotMatch(request, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(request, /"repo": "<repository>"/);
});

test("CLI rejects options outside a workflow's fixed contract", () => {
  const result = invoke(["--format", "json", "branch.status", "--target", "HEAD"]);
  assert.equal(result.status, 1);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.status, "failure");
  assert.equal(envelope.mutation_invoked, false);
  assert.match(envelope.error.message, /does not accept --target/);
});

test("CLI exposes metadata-only workflow discovery", () => {
  const listed = invoke(["--format", "json", "--list-workflows"]);
  assert.equal(listed.status, 0, listed.stderr);
  const catalog = JSON.parse(listed.stdout);
  assert.equal(catalog.schema_version, "github-writer.workflow-list/v1");
  assert.equal(catalog.safety.gh_command, "prohibited");
  assert.equal(catalog.safety.network_access, "none");
  assert.equal(catalog.workflows.length, 9);

  const helped = invoke(["--format", "json", "help", "branch.status"]);
  assert.equal(helped.status, 0, helped.stderr);
  const document = JSON.parse(helped.stdout);
  assert.equal(document.schema_version, "github-writer.help/v1");
  assert.equal(document.id, "branch.status");
  assert.equal(document.network_access, "none");
  assert.deepEqual(document.allowed_executables, ["git"]);
});

test("workflow failure records a structured error event", (t) => {
  const root = fixture(t);
  const result = invoke([
    "--format", "json", "release.evidence", "--repo", root, "--target", "missing-ref",
  ]);
  assert.equal(result.status, 1);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.status, "failure");
  assert.equal(envelope.error.schema_version, "github-writer.error/v2");
  assert.equal(envelope.error.phase, "execute");
  assert.equal(envelope.error.code, "LOCAL_GIT_FAILURE");
  assert.match(envelope.error.signature_sha256, /^[0-9a-f]{64}$/);
  assert.equal(existsSync(path.join(root, envelope.run_artifacts.result)), true);
  assert.equal(existsSync(path.join(root, envelope.run_artifacts.error_event)), true);
  const event = JSON.parse(readFileSync(path.join(root, envelope.run_artifacts.error_event), "utf8"));
  assert.equal(event.schema_version, "github-writer.error-event/v1");
  assert.equal(event.error.signature_sha256, envelope.error.signature_sha256);

  const reported = invokeScript(errorReporter, ["--format", "json", "--repo", root]);
  assert.equal(reported.status, 0, reported.stderr);
  const report = JSON.parse(reported.stdout);
  assert.equal(report.schema_version, "github-writer.error-report/v1");
  assert.equal(report.event_count, 1);
  assert.equal(report.groups[0].signature_sha256, envelope.error.signature_sha256);
});
