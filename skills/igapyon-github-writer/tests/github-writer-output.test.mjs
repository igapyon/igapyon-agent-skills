import assert from "node:assert/strict";
import test from "node:test";

import { failureEnvelope, humanOutput } from "../scripts/github-writer-output.mjs";

test("fixed human output snapshots distinguish mechanical and approval states", () => {
  assert.equal(humanOutput("branch.status", {
    repository: "sample", branch: "feature/test", upstream: null, ahead: null, behind: null, dirty: false,
  }), [
    "[SUCCESS] branch.status",
    "",
    "Repository: sample",
    "Branch: feature/test",
    "Upstream: none",
    "Ahead / behind: unknown / unknown",
    "Working tree: clean",
  ].join("\n"));
  assert.equal(humanOutput("backup.preflight", {
    repository: "sample", plan_path: "workplace/github-writer/plans/backup.json", plan_sha256: "a".repeat(64), backup_branch: "backup/test",
  }), [
    "[READY FOR APPROVAL] backup.preflight",
    "",
    "Repository: sample",
    "Plan: workplace/github-writer/plans/backup.json",
    `Plan SHA-256: ${"a".repeat(64)}`,
    "Backup branch: backup/test",
  ].join("\n"));
  assert.equal(humanOutput("approval.handoff.list", {
    repository: "sample", pending: [{ id: "b".repeat(64), apply_workflow: "backup.apply" }],
  }), [
    "[SUCCESS] approval.handoff.list",
    "",
    "Repository: sample",
    "Pending handoffs: 1",
    `${"b".repeat(64)} backup.apply`,
  ].join("\n"));
});

test("fixed failure output distinguishes not-applied, conflict, and unresolved", () => {
  const startedAt = "2026-08-12T00:00:00.000Z";
  assert.match(failureEnvelope("branch.status", new Error("requires --repo"), startedAt).human_output, /^\[NOT APPLIED\]/);
  assert.match(failureEnvelope("backup.apply", new Error("Repository state changed after preflight"), startedAt).human_output, /^\[CONFLICT\]/);
  const unresolved = new Error("Git mutation outcome is unknown");
  unresolved.mutationInvoked = true;
  assert.match(failureEnvelope("backup.apply", unresolved, startedAt).human_output, /^\[UNRESOLVED\]/);
});
