import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DATE = "2026-09-14";
const ACTIVITY_PATH = "2026/202609/activities/activity-20260914a.md";
const taskPath = "2026/202609/tasks/task-202609-00001-smoke.md";
const schedulePath = "2026/202609/schedules/schedule-20260914-smoke.md";

function fail(message) {
  throw new Error(message);
}

function runNode(nodeExecutable, scriptPath, args, { cwd, input, env }) {
  const result = spawnSync(nodeExecutable, [scriptPath, ...args], {
    cwd,
    input,
    encoding: "utf8",
    env,
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) fail(`${path.basename(scriptPath)} could not start: ${result.error.message}`);
  return result;
}

function expectSuccess(result, label) {
  if (result.status !== 0) {
    fail(`${label} failed (exit ${result.status ?? "unknown"})\n${result.stderr || result.stdout}`);
  }
}

function parseJsonOutput(result, label) {
  try { return JSON.parse(result.stdout); }
  catch {
    fail(`${label} did not return JSON\nstdout: ${JSON.stringify(result.stdout)}\nstderr: ${JSON.stringify(result.stderr)}`);
  }
}

function writeRecord(root, relativePath, content) {
  const filePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function activity(title, detail = "Node-only runtime fixture") {
  return `---\ntype: activity\ndate: ${DATE}\n---\n\n# ${title}\n\n${detail}\n`;
}

function createShadowPackage(root) {
  const packageRoot = path.join(root, "node_modules/yaml");
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, "package.json"), '{"name":"yaml","type":"module","exports":"./index.js"}\n');
  fs.writeFileSync(path.join(packageRoot, "index.js"), 'throw new Error("The copied CLI imported the target yaml package");\n');
}

function runHelpChecks({ nodeExecutable, scriptsDirectory, cwd, env }) {
  const commands = [
    ["create-activity.mjs", "--help"],
    ["update-activity.mjs", "--help"],
    ["generate-day-plan.mjs", "--help"],
    ["import-issues.mjs", "--help"],
    ["post-day-plan.mjs", "--help"],
  ];
  for (const [filename, ...args] of commands) {
    const scriptPath = path.join(scriptsDirectory, filename);
    const result = runNode(nodeExecutable, scriptPath, args, { cwd, env });
    expectSuccess(result, `${filename} --help`);
    if (!result.stdout.includes("Usage:")) fail(`${filename} --help did not execute its CLI entry point`);
  }
}

function verifyActivityUpdate({ nodeExecutable, scriptsDirectory, repoRoot, cwd, env, creation }) {
  const { path: relativePath } = parseJsonOutput(creation, "activity creation");
  const cli = path.join(scriptsDirectory, "update-activity.mjs");
  const read = runNode(nodeExecutable, cli, ["--repo-root", repoRoot, "--path", relativePath, "--read"], { cwd, env });
  expectSuccess(read, "activity read");
  const snapshot = parseJsonOutput(read, "activity read");
  const updated = snapshot.content + "\n追加した行: YAML と activity を確認しました。\n";
  const write = runNode(nodeExecutable, cli, [
    "--repo-root", repoRoot, "--path", relativePath,
    "--expected-sha256", snapshot.sha256, "--stdin",
  ], { cwd, input: updated, env });
  expectSuccess(write, "activity update");

  const saved = fs.readFileSync(path.join(repoRoot, ...relativePath.split("/")), "utf8");
  if (saved !== updated) fail("activity update did not preserve the exact submitted content");
  const stale = runNode(nodeExecutable, cli, [
    "--repo-root", repoRoot, "--path", relativePath,
    "--expected-sha256", snapshot.sha256, "--stdin",
  ], { cwd, input: activity("Stale update"), env });
  if (stale.status === 0 || !stale.stderr.includes("ACTIVITY_UPDATE_CONFLICT")) {
    fail("activity update accepted a stale hash");
  }
  if (fs.readFileSync(path.join(repoRoot, ...relativePath.split("/")), "utf8") !== saved) {
    fail("stale activity update changed the existing record");
  }
}

function createIssueFixtures(runDirectory) {
  fs.mkdirSync(runDirectory, { recursive: true });
  const source = {
    schema_version: 1,
    repo: "acme/daybook",
    import_date: DATE,
    receipt_author_logins: ["daybook-bot", "Maintainer"],
    excluded_issue_numbers: [3],
    issues: [{
      number: 42,
      url: "https://github.com/acme/daybook/issues/42",
      title: "Standalone runtime activity",
      body: "Verify that local Issue import serializes its activity record.",
      state: "open",
      is_pull_request: false,
      created_at: null,
      updated_at: "2026-09-13T12:00:00Z",
      comments_scope: "helper-returned",
      comments: [],
    }],
  };
  const manifest = {
    schema_version: 1,
    issues: [{
      number: 42,
      decision: "import",
      records: [{
        key: "standalone-runtime-activity",
        type: "task",
        action: "create",
        title: "Issue import YAML smoke",
        content: "YAML output must parse without an npm installation.",
        checklist: ["Run the standalone CLI"],
        planned_start_date: DATE,
        planned_end_date: DATE,
        date_evidence: {
          planned_start_date: "The issue body states the planned start date.",
          planned_end_date: "The issue body states the planned end date.",
        },
      }],
    }],
  };
  fs.writeFileSync(path.join(runDirectory, "source.json"), `${JSON.stringify(source, null, 2)}\n`);
  fs.writeFileSync(path.join(runDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { source, runDirectory };
}

function verifyIssueImport({ nodeExecutable, scriptsDirectory, repoRoot, cwd, env, source, runDirectory }) {
  const cli = path.join(scriptsDirectory, "import-issues.mjs");
  const relativeRun = path.relative(repoRoot, runDirectory).split(path.sep).join("/");
  const prepare = runNode(nodeExecutable, cli, [
    "prepare", "--repo-root", repoRoot,
    "--source", `${relativeRun}/source.json`,
    "--manifest", `${relativeRun}/manifest.json`,
    "--out-dir", relativeRun,
  ], { cwd, env });
  expectSuccess(prepare, "local Issue import prepare");
  const plan = JSON.parse(fs.readFileSync(path.join(runDirectory, "plan.json"), "utf8"));
  const resultPath = path.join(runDirectory, "result.json");
  const apply = runNode(nodeExecutable, cli, [
    "apply", "--repo-root", repoRoot,
    "--plan", `${relativeRun}/plan.json`,
    "--refresh-source", `${relativeRun}/source.json`,
    "--result", `${relativeRun}/result.json`,
  ], { cwd, env });
  expectSuccess(apply, "local Issue import apply");
  const taskWrite = plan.writes.find((write) => write.path.includes("/tasks/task-202609-00001-"));
  if (!taskWrite) fail("Issue import plan did not include its task record");
  const written = fs.readFileSync(path.join(repoRoot, ...taskWrite.path.split("/")), "utf8");
  if (!written.includes("source_issue_number: 42") || !written.includes("Issue import YAML smoke")) {
    fail("Issue import did not write its YAML front matter and record body");
  }
  const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  if (result.status !== "local-written" || result.issues[0].local_status !== "local-written") {
    fail(`Issue import result did not record the local write: ${JSON.stringify(result.issues[0])}`);
  }
}

function verifyDayPlanAndDryRun({ nodeExecutable, scriptsDirectory, repoRoot, cwd, env }) {
  writeRecord(repoRoot, taskPath, `---\ntype: task\nid: task-202609-00001\nstatus: todo\nplanning_state: planned\npriority: 1\ncreated: 2026-09-01\nplanned_start_date: ${DATE}\nplanned_end_date: ${DATE}\nplanned_dates_status: confirmed\nplanned_action: !!binary SGVsbG8=\n---\n\n# Isolated day-plan smoke\n`);
  writeRecord(repoRoot, schedulePath, `---\ntype: schedule\ndate: ${DATE}\nstatus: scheduled\n---\n\n# Isolated schedule smoke\n`);

  const sourceSnapshot = [taskPath, schedulePath].map((relative) => [
    relative,
    fs.readFileSync(path.join(repoRoot, ...relative.split("/")), "utf8"),
  ]);
  const generator = runNode(nodeExecutable, path.join(scriptsDirectory, "generate-day-plan.mjs"), ["--date", DATE], {
    cwd,
    env,
  });
  expectSuccess(generator, "day-plan generation");
  const planPath = path.join(repoRoot, "2026/202609/day-plan/day-plan-20260914.md");
  const markdown = fs.readFileSync(planPath, "utf8");
  if (!markdown.includes("Isolated day-plan smoke") || !markdown.includes("Isolated schedule smoke")) {
    fail("generated day-plan omitted fixture records");
  }
  if (!markdown.includes("：Hello\n")) fail("generated day-plan did not decode its binary planned action");
  for (const [relative, original] of sourceSnapshot) {
    if (fs.readFileSync(path.join(repoRoot, ...relative.split("/")), "utf8") !== original) {
      fail(`day-plan generation changed its source record: ${relative}`);
    }
  }

  const posting = runNode(nodeExecutable, path.join(scriptsDirectory, "post-day-plan.mjs"), [
    "--file", planPath,
    "--date", DATE,
    "--issue-number", "3",
    "--repo", "acme/daybook",
    "--sha", "0123456789abcdef0123456789abcdef01234567",
    "--dry-run",
  ], { cwd, env: { ...env, GITHUB_TOKEN: "" } });
  expectSuccess(posting, "notification dry-run");
  if (!posting.stdout.includes(`daybook-briefing:${DATE}`)) fail("notification dry-run omitted its date marker");
}

export function checkDaybookRuntime(bundleRoot, { nodeExecutable = process.execPath } = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "daybook node-only runtime-"));
  try {
    const installRoot = path.join(tempRoot, "installed skill", "assets", "daybook");
    const directRepo = path.join(tempRoot, "direct daybook");
    const copiedRepo = path.join(tempRoot, "copied daybook");
    const cwd = path.join(tempRoot, "unrelated working directory");
    fs.mkdirSync(installRoot, { recursive: true });
    fs.mkdirSync(directRepo, { recursive: true });
    fs.mkdirSync(copiedRepo, { recursive: true });
    fs.mkdirSync(cwd, { recursive: true });
    execFileSync("git", ["init", "--quiet"], { cwd: copiedRepo });
    execFileSync("git", ["config", "user.name", "Daybook Runtime Fixture"], { cwd: copiedRepo });
    execFileSync("git", ["config", "user.email", "daybook-runtime@example.test"], { cwd: copiedRepo });
    fs.cpSync(path.join(bundleRoot, "scripts"), path.join(installRoot, "scripts"), {
      recursive: true,
      filter: (source) => !source.endsWith(".test.mjs"),
    });
    fs.cpSync(path.join(installRoot, "scripts"), path.join(copiedRepo, "scripts"), { recursive: true });
    const installAlias = path.join(tempRoot, "installed skill alias");
    const copiedAlias = path.join(tempRoot, "copied daybook alias");
    // A junction also works on Windows without requiring symlink privileges.
    fs.symlinkSync(fs.realpathSync(installRoot), installAlias, "junction");
    fs.symlinkSync(fs.realpathSync(copiedRepo), copiedAlias, "junction");
    createShadowPackage(copiedRepo);

    if (fs.existsSync(path.join(installRoot, "node_modules"))
      || fs.existsSync(path.join(directRepo, "node_modules"))
      || fs.existsSync(path.join(directRepo, "package.json"))
      || fs.existsSync(path.join(directRepo, "package-lock.json"))) {
      fail("The direct skill execution fixture unexpectedly contains an npm installation");
    }

    const env = { ...process.env, NODE_PATH: path.join(tempRoot, "unavailable node path"), NODE_OPTIONS: "" };
    runHelpChecks({ nodeExecutable, scriptsDirectory: path.join(installRoot, "scripts"), cwd, env });
    runHelpChecks({ nodeExecutable, scriptsDirectory: path.join(installAlias, "scripts"), cwd, env });

    const create = (repoRoot, scriptsDirectory, title) => runNode(
      nodeExecutable,
      path.join(scriptsDirectory, "create-activity.mjs"),
      ["--repo-root", repoRoot, "--date", DATE, "--stdin"],
      { cwd, input: activity(title), env },
    );
    const first = create(directRepo, path.join(installRoot, "scripts"), "Direct skill activity");
    expectSuccess(first, "activity creation from the skill bundle");
    const second = create(directRepo, path.join(installAlias, "scripts"), "Second direct skill activity");
    expectSuccess(second, "second activity creation from the skill bundle");
    const draftPath = path.join(tempRoot, "activity draft.md");
    fs.writeFileSync(draftPath, activity("Activity from a draft file"), "utf8");
    const fromFile = runNode(
      nodeExecutable,
      path.join(installRoot, "scripts", "create-activity.mjs"),
      ["--repo-root", directRepo, "--date", DATE, "--file", draftPath],
      { cwd, env },
    );
    expectSuccess(fromFile, "activity creation from a draft file");
    if (parseJsonOutput(first, "first activity creation").path !== ACTIVITY_PATH
      || parseJsonOutput(second, "second activity creation").path !== ACTIVITY_PATH.replace("a.md", "b.md")
      || parseJsonOutput(fromFile, "activity creation from a draft file").path !== ACTIVITY_PATH.replace("a.md", "c.md")) {
      fail("activity creation did not advance from suffix a through c");
    }
    verifyActivityUpdate({
      nodeExecutable,
      scriptsDirectory: path.join(installRoot, "scripts"),
      repoRoot: directRepo,
      cwd,
      env,
      creation: first,
    });
    verifyActivityUpdate({
      nodeExecutable,
      scriptsDirectory: path.join(installAlias, "scripts"),
      repoRoot: directRepo,
      cwd,
      env,
      creation: second,
    });

    const noGitRepo = path.join(tempRoot, "daybook without git");
    const noGitPath = path.join(tempRoot, "path without git");
    fs.mkdirSync(noGitRepo, { recursive: true });
    fs.mkdirSync(noGitPath, { recursive: true });
    const noGitEnvironment = { ...env, PATH: noGitPath };
    const noGitResult = runNode(
      nodeExecutable,
      path.join(installRoot, "scripts", "create-activity.mjs"),
      ["--repo-root", noGitRepo, "--date", DATE, "--stdin"],
      { cwd, input: activity("Activity without Git"), env: noGitEnvironment },
    );
    expectSuccess(noGitResult, "activity creation without Git on PATH");
    const noGitOutput = parseJsonOutput(noGitResult, "activity creation without Git");
    if (noGitOutput.path !== ACTIVITY_PATH
      || !noGitOutput.warnings?.some((warning) => warning.includes("local Git history is unavailable"))) {
      fail("activity creation without Git did not use current files and report the missing history");
    }

    const copiedCreate = create(copiedRepo, path.join(copiedRepo, "scripts"), "Copied bundle activity");
    expectSuccess(copiedCreate, "activity creation from copied scripts with an unrelated yaml package present");
    verifyActivityUpdate({
      nodeExecutable,
      scriptsDirectory: path.join(copiedRepo, "scripts"),
      repoRoot: copiedRepo,
      cwd,
      env,
      creation: copiedCreate,
    });

    const { source, runDirectory } = createIssueFixtures(path.join(copiedRepo, "workplace/issue-import/node-only-smoke"));
    verifyIssueImport({
      nodeExecutable,
      scriptsDirectory: path.join(copiedAlias, "scripts"),
      repoRoot: copiedRepo,
      cwd,
      env,
      source,
      runDirectory,
    });
    verifyDayPlanAndDryRun({
      nodeExecutable,
      scriptsDirectory: path.join(copiedAlias, "scripts"),
      repoRoot: copiedRepo,
      cwd,
      env,
    });

    return {
      checked: true,
      packageInstall: false,
      cliHelpCount: 5,
      activityInputModes: ["stdin", "file"],
      noGitActivityCreation: true,
      copiedYamlShadow: true,
      aliasedCliExecution: true,
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && fs.existsSync(process.argv[1])
  && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const bundleRoot = path.resolve(process.argv[2] ?? "skills/igapyon-miku-daybook/assets/daybook");
    process.stdout.write(`${JSON.stringify(checkDaybookRuntime(bundleRoot))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
