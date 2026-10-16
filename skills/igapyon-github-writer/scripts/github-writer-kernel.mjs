// Compatibility facade. New code should import the focused module it uses.
export {
  MAX_DOCUMENT_CHARS,
  TARGET_PATTERN,
  BRANCH_PATTERN,
  boundedText,
  branchSlug,
  canonicalText,
  defaultGit,
  formatJst,
  isPathInside,
  normalizeResultPath,
  operationalBase,
  repositoryIdentity,
  repositoryRoot,
  safeRelativeExisting,
  sha256,
  uniqueFile,
  writeFileAtomic,
} from "./github-writer-core.mjs";

export {
  EVIDENCE_SCHEMA_VERSION,
  branchStatus,
  prepareAboutEvidence,
  prepareGitEvidence,
} from "./github-writer-evidence.mjs";

export {
  PLAN_SCHEMA_VERSION,
  backupApply,
  backupPreflight,
  recommitApply,
  recommitPreflight,
  validateAndSaveDraft,
} from "./github-writer-operations.mjs";

export {
  ERROR_SCHEMA_VERSION,
  RESULT_SCHEMA_VERSION,
  environmentInfo,
  failureEnvelope,
  humanOutput,
  successEnvelope,
} from "./github-writer-output.mjs";
