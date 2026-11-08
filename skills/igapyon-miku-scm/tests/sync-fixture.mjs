import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { syncGit } from "../scripts/miku-scm-sync-state.mjs";

export async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "miku-sync-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repo = path.join(directory, "work");
  const remote = path.join(directory, "remote.git");
  const other = path.join(directory, "other");
  await mkdir(repo);
  syncGit(directory, ["init", "--bare", remote]);
  syncGit(repo, ["init", "-b", "devel"]);
  const configure = (root) => {
    // Exact-byte assertions use LF regardless of the host's Git defaults.
    syncGit(root, ["config", "core.autocrlf", "false"]);
    syncGit(root, ["config", "core.eol", "lf"]);
    syncGit(root, ["config", "user.name", "Sync Test"]);
    syncGit(root, ["config", "user.email", "sync@example.invalid"]);
    syncGit(root, ["config", "commit.gpgsign", "false"]);
  };
  configure(repo);
  const write = async (file, text, root = repo) => { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), text); };
  await write(".gitignore", "workplace/\nignored/\n*.cache\n");
  await write("base.txt", "base\n");
  await write("rename.txt", "rename me\n");
  await write("delete.txt", "delete me\n");
  await write("binary.bin", Buffer.from([0, 3, 254]));
  syncGit(repo, ["add", "."]);
  syncGit(repo, ["commit", "-m", "Initial"]);
  syncGit(repo, ["remote", "add", "origin", remote]);
  syncGit(repo, ["push", "-u", "origin", "devel"]);
  syncGit(repo, ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/devel"]);
  syncGit(repo, ["switch", "-c", "devel-tiga1026aaa"]);
  // Clone configuration must take effect before its initial checkout.
  syncGit(directory, ["clone", "--config", "core.autocrlf=false", "--config", "core.eol=lf", "--branch", "devel", remote, other]);
  configure(other);
  const git = (args, options) => syncGit(repo, args, options).out;
  const commit = async (file, content, message = "Own work") => { await write(file, content); git(["add", "--", file]); git(["commit", "-m", message]); return git(["rev-parse", "HEAD"]); };
  const advance = async (file = "remote.txt", content = "shared\n") => { await write(file, content, other); syncGit(other, ["add", "--all"]); syncGit(other, ["commit", "-m", "Other work"]); syncGit(other, ["push", "origin", "devel"]); return syncGit(other, ["rev-parse", "HEAD"]).out; };
  return { directory, repo, remote, other, write, git, commit, advance, read: (file) => readFile(path.join(repo, file), "utf8"), options: { repo, remote: "origin", base: "devel", apply: true } };
}
