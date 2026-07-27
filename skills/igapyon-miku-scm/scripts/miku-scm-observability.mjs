import { createHash } from "node:crypto";

function normalizedMessage(message) {
  return String(message)
    .replace(/(?:\/[^\s:]+)+/g, "<path>")
    .replace(/\b[0-9a-f]{40,64}\b/gi, "<digest>")
    .replace(/\b\d+\b/g, "<number>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function classifyFailure(message, phase) {
  const value = String(message).toLowerCase();
  if (phase === "parse" || /unknown argument|must be|requires|invalid/.test(value)) return "invalid-input";
  if (/changed|conflict|no longer|mismatch/.test(value)) return "conflict";
  if (/stale/.test(value)) return "stale-snapshot";
  if (/auth|permission|forbidden|scope/.test(value)) return "authentication-authorization";
  if (/sandbox|operation not permitted|network.*denied/.test(value)) return "sandbox-environment";
  if (/network|timed out|timeout|could not resolve|connection/.test(value)) return "network";
  if (/dirty|detached|frozen|already exists|not eligible/.test(value)) return "expected-safe-stop";
  if (/git |gh |subprocess|exit /.test(value)) return "subprocess";
  return "implementation-bug";
}

export function failureEvent({
  workflow,
  phase,
  commandId,
  message,
  mutationInvoked,
}) {
  const classification = classifyFailure(message, phase);
  const retryability = mutationInvoked === false
    ? ["network", "sandbox-environment", "subprocess"].includes(classification)
      ? "same-plan-retry-safe"
      : "new-preflight-required"
    : "do-not-retry";
  const signatureSource = [
    workflow,
    phase,
    commandId,
    classification,
    normalizedMessage(message),
  ].join("\0");
  return {
    workflow,
    phase,
    command_id: commandId,
    classification,
    mutation_invoked: mutationInvoked,
    retryability,
    signature: createHash("sha256").update(signatureSource).digest("hex"),
  };
}
