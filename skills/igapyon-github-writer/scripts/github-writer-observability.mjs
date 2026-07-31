import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  normalizeResultPath,
  operationalBase,
  repositoryRoot,
  writeFileAtomic,
} from "./github-writer-core.mjs";

export const RUN_RECORD_SCHEMA_VERSION = "github-writer.run-record/v1";
export const ERROR_EVENT_SCHEMA_VERSION = "github-writer.error-event/v1";

const SECRET_NAME = /(?:token|password|secret|authorization|credential)/i;

function createRunId(startedAt) {
  const compact = startedAt.replace(/[-:.TZ]/g, "");
  return `${compact}-${randomUUID()}`;
}

function publicValue(name, value) {
  if (SECRET_NAME.test(name)) return "<redacted>";
  if (name === "repo") return "<repository>";
  if (typeof value === "string" && path.isAbsolute(value)) return "<absolute-path>";
  if (Array.isArray(value)) return value.map((entry) => publicValue(name, entry));
  return value;
}

function publicOptions(options) {
  return Object.fromEntries(Object.entries(options).map(([name, value]) => (
    [name, publicValue(name, value)]
  )));
}

function publicArguments(argv) {
  const output = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith("--") && SECRET_NAME.test(value)) {
      const equals = value.indexOf("=");
      output.push(equals >= 0 ? `${value.slice(0, equals)}=<redacted>` : value);
      if (equals < 0 && index + 1 < argv.length) {
        output.push("<redacted>");
        index += 1;
      }
      continue;
    }
    output.push(path.isAbsolute(value) ? "<absolute-path>" : value);
  }
  return output;
}

function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function createRunContext({ workflow, options, argv, startedAt, git }) {
  const root = repositoryRoot(options.repo, git);
  const runId = createRunId(startedAt);
  const directory = path.join(operationalBase(root), "runs", runId);
  const relativeDirectory = normalizeResultPath(path.relative(root, directory));
  const context = {
    run_id: runId,
    root,
    directory,
    relative_directory: relativeDirectory,
    request: {
      schema_version: RUN_RECORD_SCHEMA_VERSION,
      kind: "request",
      run_id: runId,
      workflow,
      started_at: startedAt,
      repository: path.basename(root),
      branch: null,
      head: null,
      arguments: publicArguments(argv),
      options: publicOptions(options),
    },
  };
  return context;
}

function artifactMetadata(context, failed) {
  const base = context.relative_directory;
  return {
    schema_version: RUN_RECORD_SCHEMA_VERSION,
    run_id: context.run_id,
    directory: base,
    request: `${base}/request.json`,
    result: `${base}/result.json`,
    error_event: failed ? `${base}/error-event.json` : null,
  };
}

export function attachRunArtifacts(envelope, context) {
  return {
    ...envelope,
    run_artifacts: artifactMetadata(context, envelope.status === "failure"),
  };
}

export function recordRunResult(context, envelope) {
  writeJson(path.join(context.directory, "request.json"), {
    ...context.request,
    branch: envelope.result?.branch ?? context.request.branch,
    head: envelope.result?.head ?? context.request.head,
  });
  writeJson(path.join(context.directory, "result.json"), envelope);
  if (envelope.status === "failure") {
    writeJson(path.join(context.directory, "error-event.json"), {
      schema_version: ERROR_EVENT_SCHEMA_VERSION,
      run_id: context.run_id,
      workflow: envelope.workflow,
      status: envelope.status,
      phase: envelope.error?.phase ?? "unknown",
      mutation_invoked: envelope.mutation_invoked,
      error: envelope.error,
      recorded_at: new Date().toISOString(),
    });
  }
  return envelope.run_artifacts;
}
