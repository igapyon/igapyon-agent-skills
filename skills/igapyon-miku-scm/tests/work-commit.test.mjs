import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  commandForPlatform,
  createGitRunner,
  parseArgs,
  runWorkCommit,
} from "../scripts/work-commit.mjs";

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitRunner(cwd, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    input: options.input,
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

async function repository(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "miku-scm-work-commit-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  git(root, "init");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.invalid");
  await writeFile(path.join(root, ".gitignore"), "workplace/\n", "utf8");
  await writeFile(path.join(root, "README.md"), "base\n", "utf8");
  if (options.versions) {
    await writeFile(path.join(root, "pom.xml"), "<project><version>1.20260810.1</version></project>\n", "utf8");
    const versionDirectory = path.join(root, "skills", "igapyon-mikuku-agent", "references");
    await (await import("node:fs/promises")).mkdir(versionDirectory, { recursive: true });
    await writeFile(path.join(versionDirectory, "VERSION.md"), "Version: 20260810a\n", "utf8");
  }
  if (options.fixedChecks) {
    await writeFile(path.join(root, "package.json"), JSON.stringify({
      mikuIndex: { required: true },
      scripts: { "check:index": "node --eval \"process.exit(0)\"" },
    }, null, 2), "utf8");
    await writeFile(path.join(root, "pom.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId>
  <artifactId>fixed-checks</artifactId>
  <version>1.0.0</version>
  <profiles><profile><id>validate-version-alignment</id></profile></profiles>
</project>
`, "utf8");
  }
  git(root, "add", ".");
  git(root, "commit", "-m", "base");
  git(root, "branch", "-M", "devel-test");
  return root;
}

function options(root, ...extra) {
  return parseArgs(["--repo", root, ...extra, "--apply"]);
}

test("parser fixes the local apply boundary and optional message", () => {
  assert.equal(parseArgs(["--apply"]).apply, true);
  assert.equal(parseArgs(["--message", "Update work", "--apply"]).message, "Update work");
  assert.throws(() => parseArgs([]), /requires --apply/);
  assert.throws(() => parseArgs(["--unknown", "--apply"]), /Unknown argument/);
  assert.throws(() => parseArgs(["--message", "a\0b", "--apply"]), /NUL/);
});

test("fixed checks use Windows command shims without a shell", () => {
  assert.equal(commandForPlatform("npm", "win32"), "npm.cmd");
  assert.equal(commandForPlatform("mvn", "win32"), "mvn.cmd");
  assert.equal(commandForPlatform("git", "win32"), "git");
  assert.equal(commandForPlatform("npm", "darwin"), "npm");
});

test("Git failure diagnostics identify a failed diff without exposing its stdout", () => {
  const stagedDiff = "<private-staged-diff>\n".repeat(5000);
  const runner = createGitRunner(() => ({
    status: 1,
    signal: null,
    error: undefined,
    stdout: stagedDiff,
    stderr: "textconv fixture returned 1",
  }));

  assert.throws(
    () => runner("/fixture", ["diff", "--cached"]),
    (error) => {
      assert.match(error.message, /exit_code=1/);
      assert.match(error.message, /signal=none/);
      assert.match(error.message, /stdout_bytes=110000/);
      assert.match(error.message, /stdout_sha256=[a-f0-9]{64}/);
      assert.match(error.message, /stderr=textconv fixture returned 1/);
      assert.doesNotMatch(error.message, /private-staged-diff/);
      return true;
    },
  );
});

test("fixed npm and Maven checks execute before the local commit", async (t) => {
  const root = await repository(t, { fixedChecks: true });
  await writeFile(path.join(root, "README.md"), "checked\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Run fixed checks"));

  assert.equal(result.status, "committed");
  assert.deepEqual(result.checks, ["npm run check:index", "mvn validate"]);
});

test("one invocation stages all ordinary non-ignored changes and commits them", async (t) => {
  const root = await repository(t);
  const before = git(root, "rev-parse", "HEAD");
  await writeFile(path.join(root, "README.md"), "changed\n", "utf8");
  await writeFile(path.join(root, "feature.txt"), "new\n", "utf8");
  await (await import("node:fs/promises")).mkdir(path.join(root, "workplace"), { recursive: true });
  await writeFile(path.join(root, "workplace", "ignored.md"), "ignored\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Implement one-shot work commit"));

  assert.equal(result.status, "committed");
  assert.equal(result.mutation_invoked, true);
  assert.equal(result.head_before, before);
  assert.notEqual(result.head, before);
  assert.deepEqual(result.paths, ["README.md", "feature.txt"]);
  assert.equal(result.working_tree_clean, true);
  assert.equal(result.message_source, "supplied");
  assert.equal(git(root, "log", "-1", "--format=%s"), "Implement one-shot work commit");
  assert.equal(git(root, "status", "--porcelain"), "");
  assert.equal(git(root, "show", "--format=", "--name-only", "HEAD").split("\n").filter(Boolean).sort().join(","), "README.md,feature.txt");
  assert.equal(result.version_notice.increment_status, "not_applicable");
});

test("staged fingerprint disables textconv and commits previously staged mixed changes", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "rename-source.txt"), "before rename\n", "utf8");
  git(root, "add", "rename-source.txt");
  git(root, "commit", "-m", "add rename source");
  git(root, "mv", "rename-source.txt", "renamed.txt");
  await writeFile(path.join(root, "README.md"), "modified\n", "utf8");
  await writeFile(path.join(root, "added.txt"), "added\n", "utf8");
  await writeFile(path.join(root, "asset.bin"), Buffer.from([0, 255, 1, 254]));
  git(root, "add", "--all");

  let textconvAttempts = 0;
  const result = await runWorkCommit(options(root, "--message", "Commit staged mixed changes"), {
    git(cwd, args, runnerOptions) {
      if (
        args[0] === "diff"
        && args.includes("--cached")
        && args.includes("--binary")
        && !args.includes("--no-textconv")
      ) {
        textconvAttempts += 1;
        throw new Error("git diff --cached failed: textconv emitted a staged diff and returned 1");
      }
      return gitRunner(cwd, args, runnerOptions);
    },
  });

  assert.equal(result.status, "committed");
  assert.equal(result.mutation_invoked, true);
  assert.equal(textconvAttempts, 0);
  assert.equal(git(root, "status", "--porcelain"), "");
  assert.equal(git(root, "show", "--format=", "--name-only", "HEAD").split("\n").filter(Boolean).sort().join(","), "README.md,added.txt,asset.bin,renamed.txt");
});

test("a genuine staged fingerprint failure remains partial and preserves the index", async (t) => {
  const root = await repository(t);
  const before = git(root, "rev-parse", "HEAD");
  await writeFile(path.join(root, "README.md"), "staged change\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Keep genuine Git failure"), {
    git(cwd, args, runnerOptions) {
      if (
        args[0] === "diff"
        && args.includes("--cached")
        && args.includes("--binary")
        && args.includes("--no-textconv")
      ) {
        throw new Error("git diff --cached failed: exit_code=128; stderr=broken repository state");
      }
      return gitRunner(cwd, args, runnerOptions);
    },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.stage, "stage");
  assert.equal(result.mutation_invoked, true);
  assert.match(result.message, /broken repository state/);
  assert.equal(git(root, "rev-parse", "HEAD"), before);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "README.md");
});

test("version-only work uses the deterministic version message without a blocking prompt", async (t) => {
  const root = await repository(t, { versions: true });
  await writeFile(path.join(root, "pom.xml"), "<project><version>1.20260810.2</version></project>\n", "utf8");
  await writeFile(path.join(root, "skills", "igapyon-mikuku-agent", "references", "VERSION.md"), "Version: 20260810b\n", "utf8");

  const result = await runWorkCommit(options(root));

  assert.equal(result.status, "committed");
  assert.equal(result.commit_message, "バージョンを1.20260810.2へ更新");
  assert.equal(result.message_source, "version_fallback");
  assert.deepEqual(result.version_notice, {
    version: "1.20260810.2",
    coupled_version: "20260810b",
    recommended_tag: "v20260810b",
    alignment: "aligned",
    increment_status: "increment_observed",
  });
});

test("ordinary work that changes version sources records an observed increment", async (t) => {
  const root = await repository(t, { versions: true });
  await writeFile(path.join(root, "README.md"), "feature with version\n", "utf8");
  await writeFile(path.join(root, "pom.xml"), "<project><version>1.20260810.2</version></project>\n", "utf8");
  await writeFile(path.join(root, "skills", "igapyon-mikuku-agent", "references", "VERSION.md"), "Version: 20260810b\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Implement versioned feature"));

  assert.equal(result.status, "committed");
  assert.equal(result.version_notice.increment_status, "increment_observed");
});

test("ordinary work without a version change records a non-blocking reminder", async (t) => {
  const root = await repository(t, { versions: true });
  await writeFile(path.join(root, "README.md"), "feature without version\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Implement feature"));

  assert.equal(result.status, "committed");
  assert.equal(result.version_notice.increment_status, "increment_not_observed");
  assert.equal(git(root, "log", "-1", "--format=%s"), "Implement feature");
});

test("repositories without a resolved version source mark the increment notice not applicable", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "ordinary change\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Ordinary change"));

  assert.equal(result.status, "committed");
  assert.equal(result.version_notice.increment_status, "not_applicable");
});

test("generic fallback is used only when no message is supplied", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "ordinary change\n", "utf8");

  const result = await runWorkCommit(options(root));

  assert.equal(result.status, "committed");
  assert.equal(result.commit_message, "作業内容を更新");
  assert.equal(result.message_source, "generic_fallback");
});

test("coupled version mismatch remains a blocking stop", async (t) => {
  const root = await repository(t, { versions: true });
  await writeFile(path.join(root, "pom.xml"), "<project><version>1.20260810.2</version></project>\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Mismatched version"));

  assert.equal(result.status, "not-applied");
  assert.equal(result.version_notice.alignment, "mismatch");
  assert.equal(result.mutation_invoked, false);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "");
});

test("sensitive path candidates stop before staging", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, ".env"), "TOKEN=not-for-git\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Must not commit secret"));

  assert.equal(result.status, "not-applied");
  assert.deepEqual(result.sensitive_paths, [".env"]);
  assert.equal(result.mutation_invoked, false);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "");
});

test("fixed sensitive-path denylist stops before staging and preserves HEAD", async (t) => {
  const candidates = [
    ".env.local",
    ".npmrc",
    ".netrc",
    ".pypirc",
    "config/secrets.production",
    "TOKEN.json",
    "credentials-prod.txt",
    "keys/id_ed25519",
    "keys/private.PEM",
  ];
  for (const candidate of candidates) {
    await t.test(candidate, async () => {
      const root = await repository(t);
      const before = git(root, "rev-parse", "HEAD");
      await mkdir(path.join(root, path.dirname(candidate)), { recursive: true });
      await writeFile(path.join(root, candidate), "candidate\n", "utf8");

      const result = await runWorkCommit(options(root, "--message", "Must not stage candidate"));

      assert.equal(result.status, "not-applied");
      assert.deepEqual(result.sensitive_paths, [candidate]);
      assert.equal(result.mutation_invoked, false);
      assert.equal(git(root, "rev-parse", "HEAD"), before);
      assert.equal(git(root, "diff", "--cached", "--name-only"), "");
    });
  }
});

test("fixed sensitive-path denylist avoids known benign names", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "tokenizer.mjs"), "export default 1;\n", "utf8");
  await writeFile(path.join(root, "secretary.md"), "notes\n", "utf8");
  await writeFile(path.join(root, "monkey.txt"), "notes\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Commit benign names"));

  assert.equal(result.status, "committed");
  assert.equal(result.sensitive_paths, undefined);
  assert.equal(git(root, "status", "--porcelain"), "");
});

test("a failing recognised check reports a known partial state after staging", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "changed\n", "utf8");
  const before = git(root, "rev-parse", "HEAD");

  const result = await runWorkCommit(options(root, "--message", "Check failure"), {
    resolveChecks: async () => [{ command: "fixture", args: [], label: "fixture check" }],
    command: () => ({ ok: false, stdout: "", stderr: "fixture failure" }),
  });

  assert.equal(result.status, "partial");
  assert.equal(result.stage, "pre-commit-check");
  assert.match(result.message, /fixture check failed/);
  assert.equal(result.mutation_invoked, true);
  assert.equal(git(root, "rev-parse", "HEAD"), before);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "README.md");
});

test("a successful check that changes a tracked worktree path stops before commit", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "staged change\n", "utf8");
  const before = git(root, "rev-parse", "HEAD");

  const result = await runWorkCommit(options(root, "--message", "Check changed tracked worktree"), {
    resolveChecks: async () => [{ command: "fixture", args: [], label: "fixture check" }],
    command: (_command, _args, cwd) => {
      writeFileSync(path.join(cwd, "README.md"), "check output\n", "utf8");
      return { ok: true, stdout: "", stderr: "" };
    },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.stage, "post-check-verify");
  assert.match(result.message, /changed the worktree/);
  assert.deepEqual(result.post_check_unstaged_paths, ["README.md"]);
  assert.deepEqual(result.post_check_untracked_paths, []);
  assert.deepEqual(result.changed_after_checks, ["README.md"]);
  assert.equal(result.mutation_invoked, true);
  assert.equal(git(root, "rev-parse", "HEAD"), before);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "README.md");
  assert.equal(git(root, "show", ":README.md"), "staged change");
  assert.equal(await readFile(path.join(root, "README.md"), "utf8"), "check output\n");
});

test("a successful check that creates an untracked path stops before commit", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "staged change\n", "utf8");
  const before = git(root, "rev-parse", "HEAD");

  const result = await runWorkCommit(options(root, "--message", "Check created untracked file"), {
    resolveChecks: async () => [{ command: "fixture", args: [], label: "fixture check" }],
    command: (_command, _args, cwd) => {
      writeFileSync(path.join(cwd, "generated-by-check.txt"), "generated\n", "utf8");
      return { ok: true, stdout: "", stderr: "" };
    },
  });

  assert.equal(result.status, "partial");
  assert.equal(result.stage, "post-check-verify");
  assert.match(result.message, /changed the worktree/);
  assert.deepEqual(result.post_check_unstaged_paths, []);
  assert.deepEqual(result.post_check_untracked_paths, ["generated-by-check.txt"]);
  assert.deepEqual(result.changed_after_checks, ["generated-by-check.txt"]);
  assert.equal(result.mutation_invoked, true);
  assert.equal(git(root, "rev-parse", "HEAD"), before);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "README.md");
  assert.equal(git(root, "status", "--porcelain"), "M  README.md\n?? generated-by-check.txt");
});

test("pre-stage resolution failures are explicitly known to be non-mutating", async (t) => {
  const root = await repository(t);
  await writeFile(path.join(root, "README.md"), "changed\n", "utf8");

  await assert.rejects(
    runWorkCommit(options(root), {
      resolveChecks: async () => { throw new Error("required check is unavailable"); },
    }),
    (error) => error?.mutationInvoked === false && /unavailable/.test(error.message),
  );
  assert.equal(git(root, "diff", "--cached", "--name-only"), "");
});

test("frozen done branches stop before staging", async (t) => {
  const root = await repository(t);
  git(root, "branch", "-m", "devel-test-done");
  await writeFile(path.join(root, "README.md"), "changed\n", "utf8");

  const result = await runWorkCommit(options(root, "--message", "Frozen branch"));

  assert.equal(result.status, "not-applied");
  assert.match(result.reason, /frozen/);
  assert.equal(git(root, "diff", "--cached", "--name-only"), "");
});
