import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function readJsonl(file) {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${file}:${index + 1}: ${error.message}`);
      }
    });
}

export function listFiles(root) {
  const result = [];
  if (!existsSync(root)) return result;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFiles(full));
    } else if (entry.isFile()) {
      result.push(full);
    }
  }
  return result;
}

export function directoryBytes(root) {
  return listFiles(root).reduce((sum, file) => sum + statSync(file).size, 0);
}

export function parseCodexEvents(stdout) {
  const events = [];
  const errors = [];
  for (const [index, raw] of stdout.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      errors.push(`stdout:${index + 1}: ${error.message}`);
    }
  }
  return { events, errors };
}

function normalizedRelative(root, file) {
  return relative(root, file).split(sep).join("/");
}

export function summarizeTrace(events, stagedSkillDir) {
  const commands = [];
  const messages = [];
  let usage = null;
  let turnCompleted = false;

  for (const event of events) {
    if (event.type === "turn.completed") {
      turnCompleted = true;
      usage = event.usage ?? null;
    }
    const item = event.item;
    if (!item) continue;
    if (item.type === "command_execution" && item.command) {
      commands.push({
        command: item.command,
        status: item.status ?? null,
        exitCode: item.exit_code ?? null,
      });
    }
    if (item.type === "agent_message" && typeof item.text === "string") {
      messages.push(item.text);
    }
  }

  const knownFiles = listFiles(stagedSkillDir);
  const stagedRoots = [...new Set([
    resolve(stagedSkillDir),
    realpathSync(stagedSkillDir),
  ])];
  const skillFilesRead = new Set();
  const writeAttempts = [];
  for (const { command } of commands) {
    for (const file of knownFiles) {
      const rel = normalizedRelative(stagedSkillDir, file);
      const fileCandidates = [...new Set([resolve(file), realpathSync(file)])];
      if (
        fileCandidates.some((candidate) => command.includes(candidate)) ||
        stagedRoots.some((root) => command.includes(root) && command.includes(rel))
      ) {
        skillFilesRead.add(rel);
      }
    }
    if (stagedRoots.some((root) => command.includes(root)) && skillFilesRead.size === 0) {
      skillFilesRead.add("<skill-directory-scan>");
    }
    const writeVerb = /(?:^|\s(?:-lc|;|&&|\|\|)\s+)["']?(?:apply_patch|touch|mkdir|rm|mv|cp|tee|sed\s+-i|perl\s+-i)\b/;
    const outputRedirect = /(?:^|\s(?:-lc|;|&&|\|\|)\s+)["']?[^;\n]*\s>>?\s[^&]/;
    if (writeVerb.test(command) || outputRedirect.test(command)) {
      writeAttempts.push(command);
    }
  }

  return {
    turnCompleted,
    usage,
    commands,
    messages,
    finalText: messages.at(-1) ?? "",
    skillFilesRead: [...skillFilesRead].sort(),
    skillRead: skillFilesRead.has("SKILL.md"),
    writeAttempts,
  };
}

function loadExpectation(testCase, testsDir) {
  if (!testCase.expectationFile) return testCase.expected ?? {};
  const file = resolve(testsDir, testCase.expectationFile);
  return JSON.parse(readFileSync(file, "utf8"));
}

export function assessDeterministic({
  testCase,
  testsDir,
  trace,
  parseErrors,
  processStatus,
  sourceText,
  resultText,
}) {
  const expected = loadExpectation(testCase, testsDir);
  const assertions = [];
  const add = (id, pass, evidence) => assertions.push({ id, pass, evidence });

  add(
    "process-exit",
    processStatus === 0,
    `codex exit status: ${processStatus}`,
  );
  add(
    "event-json",
    parseErrors.length === 0,
    parseErrors.length === 0 ? "all stdout records are JSON" : parseErrors.join("; "),
  );
  add(
    "turn-completed",
    trace.turnCompleted,
    trace.turnCompleted ? "turn.completed observed" : "turn.completed missing",
  );
  add(
    "final-message",
    trace.finalText.length > 0,
    trace.finalText.length > 0 ? "final agent message observed" : "final agent message missing",
  );

  if ((testCase.sandbox ?? "read-only") === "read-only") {
    add(
      "read-only-no-write-attempt",
      trace.writeAttempts.length === 0,
      trace.writeAttempts.length === 0
        ? "no write-like command observed"
        : trace.writeAttempts.join("; "),
    );
  }

  const forbiddenWriteRoots = testCase.forbiddenWriteRoots ?? [];
  for (const root of forbiddenWriteRoots) {
    const attempts = trace.writeAttempts.filter((command) => command.includes(root));
    add(
      `forbidden-write-root:${root}`,
      attempts.length === 0,
      attempts.length === 0 ? "no write attempt" : attempts.join("; "),
    );
  }

  if (testCase.expectedActivation) {
    const shouldRead = testCase.expectedActivation === "activate";
    add(
      "activation",
      trace.skillRead === shouldRead,
      `expected=${testCase.expectedActivation}; SKILL.md read=${trace.skillRead}`,
    );
  }

  if (testCase.expectedRead) {
    add(
      "required-route",
      trace.skillFilesRead.includes(testCase.expectedRead),
      `expected ${testCase.expectedRead}; read ${trace.skillFilesRead.join(", ") || "none"}`,
    );
  }

  for (const forbidden of testCase.forbiddenReads ?? []) {
    add(
      `forbidden-read:${forbidden}`,
      !trace.skillFilesRead.includes(forbidden),
      `read ${trace.skillFilesRead.join(", ") || "none"}`,
    );
  }

  if (typeof resultText === "string") {
    for (const required of expected.requiredSubstrings ?? []) {
      add(
        `required:${required}`,
        resultText.includes(required),
        resultText.includes(required) ? "present" : "missing",
      );
    }
    for (const forbidden of expected.forbiddenSubstrings ?? []) {
      add(
        `forbidden:${forbidden}`,
        !resultText.includes(forbidden),
        resultText.includes(forbidden) ? "unexpectedly present" : "absent",
      );
    }
    if (expected.expectUnchanged === true) {
      add(
        "artifact-unchanged",
        resultText === sourceText,
        resultText === sourceText ? "target unchanged" : "target changed",
      );
    }
    if (expected.expectChanged === true) {
      add(
        "artifact-changed",
        resultText !== sourceText,
        resultText !== sourceText ? "target changed" : "target unchanged",
      );
    }
  }

  return {
    expected,
    assertions,
    pass: assertions.every((assertion) => assertion.pass),
  };
}

export function assessEvaluatorResult(result, semanticChecks) {
  const assertions = [];
  if (!result || typeof result !== "object") {
    return {
      pass: false,
      assertions: [{ id: "evaluator-result", pass: false, evidence: "missing result" }],
    };
  }

  assertions.push({
    id: "evaluator-verdict",
    pass: result.verdict === "pass",
    evidence: `verdict=${result.verdict ?? "missing"}`,
  });

  const actual = new Map(
    Array.isArray(result.assertions)
      ? result.assertions.map((item) => [item.id, item])
      : [],
  );
  for (const id of semanticChecks) {
    const assertion = actual.get(id);
    assertions.push({
      id: `semantic:${id}`,
      pass: assertion?.pass === true,
      evidence: assertion?.evidence ?? "assertion missing",
    });
  }

  return { pass: assertions.every((item) => item.pass), assertions };
}

export function substitutePrompt(prompt, replacements) {
  let result = prompt;
  for (const [name, value] of Object.entries(replacements)) {
    result = result.replaceAll(`{{${name}}}`, value);
  }
  if (/\{\{[A-Z0-9_]+\}\}/.test(result)) {
    throw new Error(`Unresolved prompt placeholder: ${result}`);
  }
  return result;
}

export function assertNoOracleLeak(prompt, testCase) {
  const serializedExpected = JSON.stringify({
    expected: testCase.expected,
    expectedActivation: testCase.expectedActivation,
    expectedRead: testCase.expectedRead,
    semanticChecks: testCase.semanticChecks,
  });
  if (prompt.includes(serializedExpected)) {
    throw new Error(`Oracle leakage detected for ${testCase.id}`);
  }
  if (prompt.includes('"expectedActivation"') || prompt.includes('"semanticChecks"')) {
    throw new Error(`Expectation fields leaked into SUT prompt for ${testCase.id}`);
  }
}
