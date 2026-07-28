import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyPendingIssueHandoff,
  createIssueApprovalHandoff,
  parseHandoffApplyArgs,
  validateHandoffRecord,
} from "../scripts/miku-scm-handoff.mjs";

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-handoff-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function applyArguments() {
  return [
    "--repo", "a/b",
    "--draft", "workplace/miku-scm/new-issues/issue-new-202607282100.md",
    "--expected-draft-sha256", "a".repeat(64),
    "--expected-labels-sha256", "b".repeat(64),
    "--expected-contract-pair-sha256", "c".repeat(64),
    "--apply",
  ];
}

async function createPending(root, id = "handoff-1") {
  return createIssueApprovalHandoff({
    root,
    runId: id,
    preflightWorkflow: "github.issue.create.preflight",
    applyWorkflow: "github.issue.create.apply",
    applyArguments: applyArguments(),
    reviewedResult: {
      repository: "a/b",
      title: "Title",
      draft: "workplace/miku-scm/new-issues/issue-new-202607282100.md",
      draft_sha256: "a".repeat(64),
      labels: [],
      labels_sha256: "b".repeat(64),
    },
    humanSummary: "[READY FOR APPROVAL] GitHub Issue作成\n",
    createdAt: "2026-07-28T12:00:00.000Z",
  });
}

test("handoff apply parser accepts only the fixed apply gate", () => {
  assert.deepEqual(parseHandoffApplyArgs(["--apply"], "/tmp/project"), {
    root: "/tmp/project",
    apply: true,
  });
  assert.throws(() => parseHandoffApplyArgs([]), /requires --apply/);
  assert.throws(
    () => parseHandoffApplyArgs(["--apply", "--workflow", "shell"]),
    /Unknown argument/,
  );
});

test("Issue preflight handoff persists validated immutable apply arguments", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const record = JSON.parse(await readFile(path.join(root, handoff.path), "utf8"));

  assert.equal(handoff.status, "pending");
  assert.equal(record.apply_workflow, "github.issue.create.apply");
  assert.deepEqual(record.apply_arguments, applyArguments());
  assert.equal(validateHandoffRecord(record), record);
});

test("changed immutable handoff content is rejected", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const file = path.join(root, handoff.path);
  const record = JSON.parse(await readFile(file, "utf8"));
  record.apply_arguments[1] = "other/repository";
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  await assert.rejects(
    applyPendingIssueHandoff(
      { root, apply: true },
      { runApply: async () => ({ status: "success" }) },
    ),
    /immutable content changed|record changed/,
  );
});

test("apply requires exactly one pending handoff and forwards unchanged arguments", async (t) => {
  const root = await workspace(t);
  const handoff = await createPending(root);
  const calls = [];
  const result = await applyPendingIssueHandoff(
    { root, apply: true },
    {
      now: () => new Date("2026-07-28T12:01:00.000Z"),
      runApply: async (workflow, args) => {
        calls.push({ workflow, args });
        return {
          status: "success",
          run_id: "apply-run",
          mutation_invoked: true,
          human_output: "[SUCCESS] GitHub Issue作成\n",
        };
      },
    },
  );

  assert.deepEqual(calls, [{
    workflow: "github.issue.create.apply",
    args: applyArguments(),
  }]);
  assert.equal(result.status, "applied");
  const record = JSON.parse(await readFile(path.join(root, handoff.path), "utf8"));
  assert.equal(record.status, "applied");
  assert.equal(record.apply_run_id, "apply-run");

  await assert.rejects(
    applyPendingIssueHandoff(
      { root, apply: true },
      { runApply: async () => ({ status: "success" }) },
    ),
    /No pending/,
  );
});

test("multiple pending handoffs stop before apply", async (t) => {
  const root = await workspace(t);
  await mkdir(path.join(root, "workplace", "miku-scm", "handoffs"), { recursive: true });
  await createPending(root, "handoff-1");
  await createPending(root, "handoff-2");
  let invoked = false;

  await assert.rejects(
    applyPendingIssueHandoff(
      { root, apply: true },
      { runApply: async () => { invoked = true; } },
    ),
    /Multiple pending/,
  );
  assert.equal(invoked, false);
});
