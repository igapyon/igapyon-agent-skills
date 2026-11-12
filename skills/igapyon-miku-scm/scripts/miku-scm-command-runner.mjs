import { spawnSync } from "node:child_process";

const DEFAULT_MAX_BUFFER = 20 * 1024 * 1024;
export const DEFAULT_GIT_TIMEOUT_MS = 120_000;

export function platformWarnings(platform = process.platform) {
  return ["darwin", "win32"].includes(platform) ? []
    : [`Platform ${platform}: continuing with the available Git and Node.js commands.`];
}

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
export function createCommandRunner({ executable, maxBuffer = DEFAULT_MAX_BUFFER, platform = process.platform, spawn = spawnSync,
  defaultTimeout, env, forceEnv, failureMessage = diagnostic } = {}) {
  if (!executable || typeof executable !== "string") throw new Error("executable is required");
  return (cwd, args, options = {}) => {
    if (!Array.isArray(args) || args.some((value) => typeof value !== "string")) {
      throw new Error("command arguments must be a string array");
    }
    const timeout = options.timeout ?? defaultTimeout;
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
      throw new Error("timeout must be a positive finite number");
    }
    const spawnOptions = {
      cwd,
      encoding: "utf8",
      input: options.input,
      maxBuffer,
      shell: false,
    };
    if (env || options.env || forceEnv) spawnOptions.env = { ...process.env, ...env, ...options.env, ...forceEnv };
    if (platform === "win32") spawnOptions.windowsHide = true;
    if (timeout !== undefined) spawnOptions.timeout = timeout;
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
    if (!response.ok && !options.allowFailure) throw new Error(failureMessage(args, result, stdout, stderr));
    return response;
  };
}

export function createGitCommandRunner(options = {}) {
  const { timeout = DEFAULT_GIT_TIMEOUT_MS, ...runnerOptions } = options;
  return createCommandRunner({ ...runnerOptions, defaultTimeout: timeout, forceEnv: { GIT_TERMINAL_PROMPT: "0" },
    failureMessage: (args, result) => `git ${args[0] ?? "command"} failed (exit ${result.status ?? "unknown"}`
      + `${result.signal ? `, signal ${result.signal}` : ""}${result.error?.code ? `, ${result.error.code}` : ""})`, executable: "git" });
}

export function createGhCommandRunner(options = {}) {
  return createCommandRunner({ ...options, executable: "gh", maxBuffer: options.maxBuffer ?? 1024 * 1024 });
}
