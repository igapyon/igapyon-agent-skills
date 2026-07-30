import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { errorReport } from "../scripts/miku-scm-error-report.mjs";
import { classifyFailure, failureEvent } from "../scripts/miku-scm-observability.mjs";

test("failure classification separates safe stops, conflicts, and environment failures", () => {
  assert.equal(classifyFailure("Working tree is dirty", "delegate"), "expected-safe-stop");
  assert.equal(classifyFailure("Reviewed parent changed", "delegate"), "conflict");
  assert.equal(classifyFailure("network denied by sandbox", "delegate"), "sandbox-environment");
  assert.equal(classifyFailure("Unknown argument: --shell", "parse"), "invalid-input");
});

test("stable signature removes changing paths, numbers, and digests", () => {
  const first = failureEvent({
    workflow: "x.y", phase: "delegate", commandId: "read",
    message: "git /tmp/a failed at 123 abcdefabcdefabcdefabcdefabcdefabcdefabcd",
    mutationInvoked: false,
  });
  const second = failureEvent({
    workflow: "x.y", phase: "delegate", commandId: "read",
    message: "git /tmp/b failed at 456 0123456789012345678901234567890123456789",
    mutationInvoked: false,
  });
  assert.equal(first.signature, second.signature);
  assert.equal(first.retryability, "same-plan-retry-safe");
});

test("error report groups repeated signatures", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-error-report-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runs = path.join(root, "workplace", "miku-scm", "runs");
  const event = {
    signature: "a".repeat(64),
    workflow: "x.y",
    phase: "delegate",
    command_id: "read",
    classification: "network",
    mutation_invoked: false,
    retryability: "same-plan-retry-safe",
  };
  for (const name of ["one", "two"]) {
    await mkdir(path.join(runs, name), { recursive: true });
    await writeFile(path.join(runs, name, "error-event.json"), JSON.stringify(event), "utf8");
  }
  const report = await errorReport({ root });
  assert.equal(report.inspected_error_runs, 2);
  assert.equal(report.unique_signatures, 1);
  assert.equal(report.signatures[0].count, 2);
});
