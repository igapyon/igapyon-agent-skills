import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("sync fixture keeps LF checkout and stash bytes under inherited CRLF defaults", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "miku-sync-eol-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const globalConfig = path.join(directory, "global.gitconfig");
  await writeFile(globalConfig, "[core]\n\tautocrlf = true\n\teol = crlf\n", "utf8");
  const fixtureUrl = new URL("./sync-fixture.mjs", import.meta.url).href;
  const stateUrl = new URL("../scripts/miku-scm-sync-state.mjs", import.meta.url).href;
  const script = `
    import assert from "node:assert/strict";
    import { readFile } from "node:fs/promises";
    import path from "node:path";
    import { fixture } from ${JSON.stringify(fixtureUrl)};
    import { syncGit } from ${JSON.stringify(stateUrl)};

    const cleanups = [];
    try {
      assert.equal(syncGit(process.cwd(), ["config", "--global", "--get", "core.autocrlf"]).out, "true");
      const f = await fixture({ after(cleanup) { cleanups.push(cleanup); } });
      assert.equal(await readFile(path.join(f.other, "base.txt"), "utf8"), "base\\n");

      await f.write("base.txt", "force a checkout\\n");
      f.git(["checkout", "--", "base.txt"]);
      assert.equal(await f.read("base.txt"), "base\\n");

      await f.write("carry.txt", "stage\\n");
      f.git(["add", "carry.txt"]);
      await f.write("carry.txt", "stage\\nunstaged\\n");
      f.git(["stash", "push", "--include-untracked"]);
      const stash = f.git(["rev-parse", "refs/stash"]);
      f.git(["stash", "apply", "--index", stash]);
      assert.equal(await f.read("carry.txt"), "stage\\nunstaged\\n");
      assert.equal(f.git(["show", ":carry.txt"]), "stage");
    } finally {
      for (const cleanup of cleanups.reverse()) await cleanup();
    }
  `;

  // Isolate the inherited configuration without changing this process or the user's Git config.
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: directory,
    env: { ...process.env, GIT_CONFIG_GLOBAL: globalConfig },
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 120_000,
  });
  assert.equal(child.status, 0, `${child.error?.message ?? ""}\n${child.stdout}\n${child.stderr}`);
});
