import assert from "node:assert/strict";
import test from "node:test";
import {
  assessDeterministic,
  assessEvaluatorResult,
  assertNoOracleLeak,
  parseCodexEvents,
  summarizeTrace,
} from "./harness-lib.mjs";

const testsDir = new URL(".", import.meta.url).pathname;

test("missing output fails even when process exits zero", () => {
  const parsed = parseCodexEvents("");
  const trace = summarizeTrace(parsed.events, testsDir);
  const result = assessDeterministic({
    testCase: {
      id: "missing-output",
      sandbox: "read-only",
      expectedActivation: "activate",
    },
    testsDir,
    trace,
    parseErrors: parsed.errors,
    processStatus: 0,
    sourceText: null,
    resultText: null,
  });
  assert.equal(result.pass, false);
  assert.equal(result.assertions.find((item) => item.id === "process-exit").pass, true);
  assert.equal(result.assertions.find((item) => item.id === "turn-completed").pass, false);
});

test("invalid event JSON fails", () => {
  const parsed = parseCodexEvents("not-json\n");
  const trace = summarizeTrace(parsed.events, testsDir);
  const result = assessDeterministic({
    testCase: { id: "invalid-json", sandbox: "read-only" },
    testsDir,
    trace,
    parseErrors: parsed.errors,
    processStatus: 0,
    sourceText: null,
    resultText: null,
  });
  assert.equal(result.assertions.find((item) => item.id === "event-json").pass, false);
});

test("evaluator pass false fails", () => {
  const result = assessEvaluatorResult(
    {
      verdict: "fail",
      assertions: [{ id: "critical-command", pass: false, evidence: "missing" }],
    },
    ["critical-command"],
  );
  assert.equal(result.pass, false);
});

test("missing semantic assertion fails", () => {
  const result = assessEvaluatorResult(
    { verdict: "pass", assertions: [] },
    ["critical-command"],
  );
  assert.equal(result.pass, false);
  assert.match(result.assertions.at(-1).evidence, /missing/);
});

test("wrong semantic assertion fails", () => {
  const result = assessEvaluatorResult(
    {
      verdict: "pass",
      assertions: [{ id: "critical-command", pass: false, evidence: "wrong command" }],
    },
    ["critical-command"],
  );
  assert.equal(result.pass, false);
});

test("expectation fields in SUT prompt are rejected", () => {
  assert.throws(
    () => assertNoOracleLeak('{"expectedActivation":"activate"}', {
      id: "leak",
      expectedActivation: "activate",
    }),
    /leak/i,
  );
});

test("read-only write attempt fails", () => {
  const stdout = [
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "/bin/zsh -lc touch result.txt",
        status: "failed",
        exit_code: 1,
      },
    }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
    JSON.stringify({ type: "turn.completed", usage: {} }),
  ].join("\n");
  const parsed = parseCodexEvents(stdout);
  const trace = summarizeTrace(parsed.events, testsDir);
  const result = assessDeterministic({
    testCase: { id: "write", sandbox: "read-only" },
    testsDir,
    trace,
    parseErrors: parsed.errors,
    processStatus: 0,
    sourceText: null,
    resultText: null,
  });
  assert.equal(result.assertions.find((item) => item.id === "read-only-no-write-attempt").pass, false);
});

test("searching for write-related words is not a write attempt", () => {
  const stdout = [
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: '/bin/zsh -lc "rg -n \\"mkdir|writeFile|touch\\" ."',
        status: "completed",
        exit_code: 0,
      },
    }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
    JSON.stringify({ type: "turn.completed", usage: {} }),
  ].join("\n");
  const parsed = parseCodexEvents(stdout);
  const trace = summarizeTrace(parsed.events, testsDir);
  assert.deepEqual(trace.writeAttempts, []);
});

const criticalMutations = [
  ["command", "./scripts/deploy.sh --service svc-prod-042"],
  ["service ID", "svc-prod-042"],
  ["URL", "https://example.invalid/health"],
  ["confirmation", "confirmation received"],
  ["rollback", "./scripts/rollback.sh --service svc-prod-042"],
];

for (const [label, criticalValue] of criticalMutations) {
  test(`critical ${label} mutation is detected`, () => {
  const trace = {
    turnCompleted: true,
    finalText: "done",
    skillRead: false,
    skillFilesRead: [],
    writeAttempts: [],
  };
  const result = assessDeterministic({
    testCase: {
      id: "mutation",
      sandbox: "workspace-write",
      expected: { requiredSubstrings: [criticalValue] },
    },
    testsDir,
    trace,
    parseErrors: [],
    processStatus: 0,
    sourceText: criticalValue,
    resultText: "mutated artifact",
  });
  assert.equal(result.pass, false);
  assert.equal(
    result.assertions.find((item) => item.id === `required:${criticalValue}`).pass,
    false,
  );
  });
}

test("write outside disposable root is detected", () => {
  const trace = {
    turnCompleted: true,
    finalText: "done",
    skillRead: false,
    skillFilesRead: [],
    writeAttempts: ["touch /workspace/real-user-file"],
  };
  const result = assessDeterministic({
    testCase: {
      id: "outside-write",
      sandbox: "workspace-write",
      forbiddenWriteRoots: ["/workspace"],
    },
    testsDir,
    trace,
    parseErrors: [],
    processStatus: 0,
    sourceText: null,
    resultText: null,
  });
  assert.equal(result.assertions.find((item) => item.id.startsWith("forbidden-write-root:")).pass, false);
});

test("a target file named SKILL.md is not mistaken for the staged Skill", () => {
  const stdout = [
    JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: "/bin/zsh -lc sed -n 1,20p /tmp/unrelated/SKILL.md",
        status: "completed",
        exit_code: 0,
      },
    }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
    JSON.stringify({ type: "turn.completed", usage: {} }),
  ].join("\n");
  const parsed = parseCodexEvents(stdout);
  const trace = summarizeTrace(parsed.events, testsDir);
  assert.equal(trace.skillRead, false);
});
