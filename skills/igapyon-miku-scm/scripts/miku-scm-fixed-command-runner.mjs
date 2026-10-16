import { spawnSync } from "node:child_process";

const FIXED_COMMAND_ARGUMENTS = Object.freeze({
  npm: Object.freeze(["run", "check:index"]),
  mvn: Object.freeze(["validate"]),
});

function sameArguments(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertFixedCommand(command, args) {
  const expected = FIXED_COMMAND_ARGUMENTS[command];
  if (!expected || !sameArguments(args, expected)) {
    throw new Error(`Unsupported fixed command: ${command} ${args.join(" ")}`);
  }
}

export function commandForPlatform(command, platform = process.platform) {
  if (platform === "win32" && Object.hasOwn(FIXED_COMMAND_ARGUMENTS, command)) {
    return `${command}.cmd`;
  }
  return command;
}

export function fixedCommandInvocation(command, args, options = {}) {
  assertFixedCommand(command, args);
  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return { command, args: [...args], shell: false };
  }
  const comSpec = options.comSpec ?? process.env.ComSpec ?? "cmd.exe";
  const commandLine = [commandForPlatform(command, platform), ...args].join(" ");
  return {
    command: comSpec,
    args: ["/d", "/s", "/c", commandLine],
    shell: false,
  };
}

export function runFixedCommand(command, args, cwd, dependencies = {}) {
  const invocation = fixedCommandInvocation(command, args, dependencies);
  const spawn = dependencies.spawn ?? spawnSync;
  const result = spawn(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
    error_code: result.error?.code,
  };
}
