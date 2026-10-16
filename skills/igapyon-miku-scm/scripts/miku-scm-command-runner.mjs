import { spawnSync } from "node:child_process";

const DEFAULT_MAX_BUFFER = 20 * 1024 * 1024;

function diagnostic(args, result, stdout, stderr) {
  const detail = stderr || stdout || result.error?.message || "";
  return `command ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`;
}

/**
 * Run one fixed executable with an argv array.  Git for Windows resolves
 * `git`/`gh` to their .exe files through PATH, so no shell or .cmd fallback is
 * needed here.  Keeping this boundary shared prevents platform-specific shell
 * quoting from entering a workflow.
 */
export function createCommandRunner({ executable, maxBuffer = DEFAULT_MAX_BUFFER, platform = process.platform, spawn = spawnSync } = {}) {
  if (!executable || typeof executable !== "string") throw new Error("executable is required");
  return (cwd, args, options = {}) => {
    if (!Array.isArray(args) || args.some((value) => typeof value !== "string")) {
      throw new Error("command arguments must be a string array");
    }
    const spawnOptions = {
      cwd,
      encoding: "utf8",
      input: options.input,
      maxBuffer,
      shell: false,
    };
    if (platform === "win32") spawnOptions.windowsHide = true;
    if (Number.isFinite(options.timeout) && options.timeout > 0) spawnOptions.timeout = options.timeout;
    const result = spawn(executable, args, spawnOptions);
    const stdout = result.stdout ? String(result.stdout) : "";
    const stderr = result.stderr ? String(result.stderr) : "";
    const response = {
      ok: result.status === 0,
      status: result.status,
      signal: result.signal ?? null,
      stdout,
      stderr,
      error: result.error,
    };
    if (!response.ok && !options.allowFailure) throw new Error(diagnostic(args, result, stdout, stderr));
    return response;
  };
}

export function createGitCommandRunner(options = {}) {
  return createCommandRunner({ ...options, executable: "git" });
}

export function createGhCommandRunner(options = {}) {
  return createCommandRunner({ ...options, executable: "gh", maxBuffer: options.maxBuffer ?? 1024 * 1024 });
}
