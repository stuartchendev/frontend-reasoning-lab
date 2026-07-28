import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION,
  parseDiagnoseInitialAnswerRequest,
  parseDiagnoseInitialAnswerResponse,
} from "../src/domain/v3/diagnosisApi.ts";
import {
  REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
  parseReviewRevisedAnswerRequest,
  parseReviewRevisedAnswerResponse,
} from "../src/domain/v3/revisionReviewApi.ts";
import { reactStateOwnershipQuestion } from "../src/domain/v3/questionContent.ts";
import {
  flawedStateOwnershipAnswer,
  revisedStateOwnershipAnswer,
} from "../src/data/v3/referencePracticeFixtures.ts";
import { parseAiRuntimeStatus } from "../src/lib/v3/aiRuntimeStatusService.ts";
import {
  getCanonicalDiagnosisContext,
} from "../src/server/v3/diagnosisPipeline.ts";
import {
  AiProviderConfigurationError,
  resolveAiProvider,
} from "../src/server/v3/aiProvider.ts";
import {
  selectRevisionRecommendationCandidates,
} from "../src/server/v3/revisionReviewPipeline.ts";
import {
  validateInitialDiagnosisResult,
  validateRevisionComparisonResult,
} from "../src/server/v3/evaluation.ts";

const BASE_URL = process.env.OPENAI_LIVE_SMOKE_BASE_URL ??
  "http://127.0.0.1:5173";
const REQUEST_TIMEOUT_MS = 55_000;
const DIAGNOSIS_PATH = "/.netlify/functions/diagnose-initial-answer";
const REVIEW_PATH = "/.netlify/functions/review-revised-answer";
const STATUS_PATH = "/.netlify/functions/ai-runtime-status";
let liveExecutionStarted = false;

class SmokeError extends Error {
  constructor(code, message, liveExecutionStatus = "not-run") {
    super(message);
    this.code = code;
    this.liveExecutionStatus = liveExecutionStatus;
  }
}

function fail(code, message, liveExecutionStatus) {
  throw new SmokeError(code, message, liveExecutionStatus);
}

function getOutputDirectory() {
  const args = process.argv.slice(2);

  if (args.length === 0) return undefined;
  if (args.length !== 2 || args[0] !== "--output-dir" || !args[1]) {
    return fail(
      "invalid-arguments",
      "Use --output-dir followed by one directory path.",
    );
  }

  return args[1];
}

function loadConfiguration() {
  let resolution;

  try {
    resolution = resolveAiProvider(process.env);
  } catch (error) {
    if (
      error instanceof AiProviderConfigurationError &&
      error.provider === "lm-studio"
    ) {
      return fail(
        "invalid-lm-studio-configuration",
        "Remove both LM_STUDIO_BASE_URL and LM_STUDIO_MODEL before running the OpenAI live two-call HTTP smoke.",
      );
    }

    return fail(
      "missing-openai-api-key",
      "OPENAI_API_KEY is required for a live OpenAI HTTP smoke. No model request was sent.",
    );
  }

  if (resolution.provider === "lm-studio") {
    return fail(
      "lm-studio-provider-selected",
      "Remove LM_STUDIO_BASE_URL and LM_STUDIO_MODEL before running the OpenAI live two-call HTTP smoke.",
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return fail(
      "missing-openai-api-key",
      "OPENAI_API_KEY is required for a live OpenAI HTTP smoke. No model request was sent.",
    );
  }

  let baseUrl;

  try {
    baseUrl = new URL(BASE_URL);
  } catch {
    return fail(
      "invalid-base-url",
      "OPENAI_LIVE_SMOKE_BASE_URL must be a valid loopback HTTP origin.",
    );
  }

  const isLoopback =
    ["127.0.0.1", "localhost", "[::1]"].includes(baseUrl.hostname) &&
    baseUrl.protocol === "http:";

  if (
    !isLoopback ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    !["", "/"].includes(baseUrl.pathname)
  ) {
    return fail(
      "invalid-base-url",
      "OPENAI_LIVE_SMOKE_BASE_URL must be a loopback HTTP origin without credentials, query, hash, or path.",
    );
  }

  return { apiKey: apiKey.trim(), baseUrl: baseUrl.origin };
}

async function fetchSafely(url, init, liveExecutionStatus = "not-run") {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return fail(
      "netlify-server-unavailable",
      "The local Netlify server is unavailable. Start it with npm run dev:netlify and retry.",
      liveExecutionStatus,
    );
  }
}

async function parseResponse(
  response,
  parser,
  label,
  liveExecutionStatus = "failed",
) {
  let parsed;

  try {
    parsed = parser(await response.json());
  } catch {
    return fail(
      "invalid-http-response",
      `${label} did not return a valid FRL response envelope.`,
      liveExecutionStatus,
    );
  }

  if (response.ok !== parsed.ok) {
    return fail(
      "invalid-http-response",
      `${label} HTTP status and response envelope disagree.`,
      liveExecutionStatus,
    );
  }

  return parsed;
}

async function verifyLocalServer(baseUrl) {
  const response = await fetchSafely(baseUrl + DIAGNOSIS_PATH, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const envelope = await parseResponse(
    response,
    parseDiagnoseInitialAnswerResponse,
    "Diagnosis preflight",
    "not-run",
  );

  if (
    response.status !== 405 ||
    envelope.ok ||
    envelope.contractVersion !==
      DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION
  ) {
    return fail(
      "netlify-endpoint-unavailable",
      "The diagnosis URL is not the expected Netlify Function endpoint.",
    );
  }

  const statusResponse = await fetchSafely(baseUrl + STATUS_PATH, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  let runtimeStatus;

  try {
    runtimeStatus = parseAiRuntimeStatus(await statusResponse.json());
  } catch {
    return fail(
      "runtime-provider-unverifiable",
      "The local runtime status could not verify OpenAI provider selection.",
    );
  }

  const openAiIsConfigured =
    statusResponse.ok &&
    runtimeStatus.provider === "openai" &&
    runtimeStatus.status === "configured" &&
    runtimeStatus.model === "gpt-5.6-luna";

  if (!openAiIsConfigured) {
    return fail(
      "runtime-provider-unverifiable",
      "The running Netlify server did not report the expected configured OpenAI provider. Restart it with OpenAI-only environment settings.",
    );
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );

  return nested.flat();
}

async function verifyBundleSafety(apiKey) {
  let files;

  try {
    files = await listFiles(resolve("dist"));
  } catch {
    return fail(
      "bundle-unavailable",
      "Run npm run build before the live two-call HTTP smoke.",
    );
  }

  if (files.length === 0) {
    return fail(
      "bundle-unavailable",
      "The production bundle is empty. Run npm run build first.",
    );
  }

  let keyFound = false;
  let markerFound = false;

  for (const file of files) {
    const contents = await readFile(file);
    keyFound ||= contents.includes(Buffer.from(apiKey));
    markerFound ||= contents.includes(Buffer.from("OPENAI_API_KEY"));
  }

  if (keyFound || markerFound) {
    return fail(
      "bundle-secret-check-failed",
      "The production bundle contains OpenAI server-only configuration. No model request was sent.",
    );
  }

  return {
    status: "passed",
    filesScanned: files.length,
    apiKeyAbsent: true,
    serverEnvironmentMarkerAbsent: true,
  };
}

async function post(baseUrl, path, request, parser, label) {
  const response = await fetchSafely(
    baseUrl + path,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(request),
    },
    "failed",
  );
  const envelope = await parseResponse(response, parser, label);

  if (!envelope.ok) {
    return fail(
      `${label.toLowerCase().replaceAll(" ", "-")}-failed`,
      `${label} returned HTTP ${response.status}, safe code ${envelope.error.code}, trace ${envelope.meta.traceId}.`,
      "failed",
    );
  }

  if (response.status !== 200) {
    return fail(
      "invalid-http-response",
      `${label} returned a successful envelope with HTTP ${response.status}; HTTP 200 is required.`,
      "failed",
    );
  }

  return { httpStatus: response.status, envelope };
}

function summarize(call, resultKind) {
  return {
    httpStatus: call.httpStatus,
    contractVersion: call.envelope.contractVersion,
    resultKind,
    modelLatencyMs: call.envelope.meta.modelLatencyMs,
    usage: call.envelope.meta.usage,
    traceId: call.envelope.meta.traceId,
  };
}

function renderMarkdown(evidence) {
  const call1 = evidence.calls.call1;
  const call2 = evidence.calls.call2;

  return `# OpenAI live two-call HTTP smoke evidence

- Setup: ${evidence.setupStatus}
- Fake-transport tests: ${evidence.fakeTransportTests}
- Live HTTP smoke: ${evidence.liveExecutionStatus}
- Browser execution: ${evidence.browserExecutionStatus}
- Expected reducer outcome (architectural expectation only): \`${evidence.expectedReducerOutcome.phase} / ${evidence.expectedReducerOutcome.completionKind}\`

| Check | Call 1 | Call 2 |
| --- | --- | --- |
| HTTP status | ${call1.httpStatus} | ${call2.httpStatus} |
| Contract version | ${call1.contractVersion} | ${call2.contractVersion} |
| Result kind | ${call1.resultKind} | ${call2.resultKind} |
| Model latency | ${call1.modelLatencyMs} ms | ${call2.modelLatencyMs} ms |
| Usage | ${JSON.stringify(call1.usage)} | ${JSON.stringify(call2.usage)} |
| Trace ID | ${call1.traceId} | ${call2.traceId} |

Bundle safety passed across ${evidence.bundleSafety.filesScanned} files. The exact runtime key and server environment marker were absent.

Generated ${evidence.generatedAt}. This artifact omits the API key, raw provider details, prompts, learner answers, and full model output.
`;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

async function assertOutputDirectoryAvailable(requestedDirectory) {
  if (!requestedDirectory) return;

  if (await pathExists(resolve(requestedDirectory))) {
    return fail(
      "output-directory-exists",
      "The evidence output directory already exists. Refusing to overwrite it.",
    );
  }
}

export async function saveEvidence(evidence, requestedDirectory) {
  const timestamp = evidence.generatedAt.replaceAll(":", "-").replaceAll(".", "-");
  const directory = resolve(
    requestedDirectory ?? join("tmp/openai-live-smoke", timestamp),
  );
  const parentDirectory = dirname(directory);

  if (await pathExists(directory)) {
    return fail(
      "output-directory-exists",
      "The evidence output directory already exists. Refusing to overwrite it.",
      "failed",
    );
  }

  let stagingDirectory;

  try {
    await mkdir(parentDirectory, { recursive: true });
    stagingDirectory = await mkdtemp(
      join(parentDirectory, `.${basename(directory)}-staging-`),
    );
    const writeResults = await Promise.allSettled([
      writeFile(
        join(stagingDirectory, "openai-live-smoke-evidence.json"),
        JSON.stringify(evidence, null, 2) + "\n",
      ),
      writeFile(
        join(stagingDirectory, "openai-live-smoke-evidence.md"),
        renderMarkdown(evidence),
      ),
    ]);

    if (writeResults.some((result) => result.status === "rejected")) {
      return fail(
        "evidence-publish-failed",
        "Evidence could not be published atomically. No passed evidence was saved.",
        "failed",
      );
    }

    if (await pathExists(directory)) {
      return fail(
        "output-directory-exists",
        "The evidence output directory appeared while publishing. Refusing to overwrite it.",
        "failed",
      );
    }

    await rename(stagingDirectory, directory);
    stagingDirectory = undefined;
  } catch (error) {
    if (stagingDirectory) {
      await rm(stagingDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }

    if (error instanceof SmokeError) throw error;

    return fail(
      "evidence-publish-failed",
      "Evidence could not be published atomically. No passed evidence was saved.",
      "failed",
    );
  }

  return directory;
}

async function main() {
  const outputDirectory = getOutputDirectory();
  await assertOutputDirectoryAvailable(outputDirectory);
  const { apiKey, baseUrl } = loadConfiguration();

  await verifyLocalServer(baseUrl);
  const bundleSafety = await verifyBundleSafety(apiKey);

  const originalAnswer = flawedStateOwnershipAnswer;
  const revisedAnswer = revisedStateOwnershipAnswer;
  const call1Request = parseDiagnoseInitialAnswerRequest({
    contractVersion: DIAGNOSE_INITIAL_ANSWER_CONTRACT_VERSION,
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    answer: originalAnswer,
  });
  liveExecutionStarted = true;
  const call1 = await post(
    baseUrl,
    DIAGNOSIS_PATH,
    call1Request,
    parseDiagnoseInitialAnswerResponse,
    "Call 1",
  );
  const diagnosis = validateInitialDiagnosisResult(
    call1.envelope.result,
    {
      spec: getCanonicalDiagnosisContext(call1Request.questionId)
        .evaluationSpec,
      normalizedAnswer: originalAnswer.trim(),
    },
  );

  if (diagnosis.outcome !== "needs-follow-up") {
    return fail(
      "call-1-did-not-require-follow-up",
      "Call 1 was valid but did not enter the required two-call path.",
      "failed",
    );
  }

  const call2Request = parseReviewRevisedAnswerRequest({
    contractVersion: REVIEW_REVISED_ANSWER_CONTRACT_VERSION,
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    originalAnswer,
    revisedAnswer,
    diagnosis,
  });
  const call2 = await post(
    baseUrl,
    REVIEW_PATH,
    call2Request,
    parseReviewRevisedAnswerResponse,
    "Call 2",
  );
  const candidateQuestionIds = selectRevisionRecommendationCandidates(
    diagnosis.primaryGap.criterionId,
  ).map((candidate) => candidate.id);
  const revisionReview = validateRevisionComparisonResult(
    call2.envelope.result,
    {
      diagnosis,
      normalizedOriginalAnswer: originalAnswer.trim(),
      normalizedRevisedAnswer: revisedAnswer.trim(),
      candidateQuestionIds,
    },
  );

  const evidence = {
    evidenceVersion: "1",
    generatedAt: new Date().toISOString(),
    setupStatus: "complete",
    fakeTransportTests: "separate-not-run-by-live-command",
    liveExecutionStatus: "passed",
    browserExecutionStatus: "not-run",
    providerSelection: "openai",
    question: {
      id: reactStateOwnershipQuestion.id,
      version: reactStateOwnershipQuestion.version,
    },
    calls: {
      call1: {
        endpoint: DIAGNOSIS_PATH,
        ...summarize(call1, diagnosis.outcome),
      },
      call2: {
        endpoint: REVIEW_PATH,
        ...summarize(call2, revisionReview.resolution),
      },
    },
    expectedReducerOutcome: {
      phase: "complete",
      completionKind: "revision-reviewed",
      basis: "architectural-expectation-not-executed",
    },
    bundleSafety,
    redactions: [
      "api-key",
      "raw-provider-details",
      "prompts",
      "learner-answers",
      "full-model-output",
    ],
  };
  const savedTo = await saveEvidence(evidence, outputDirectory);

  console.log(JSON.stringify(evidence));
  console.error(
    `OpenAI live two-call HTTP smoke passed. Evidence saved to ${savedTo}`,
  );
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  try {
    await main();
  } catch (error) {
    const safeError = error instanceof SmokeError
      ? error
      : new SmokeError(
          "unexpected-smoke-error",
          "The smoke stopped on an unexpected local error.",
          liveExecutionStarted ? "failed" : "not-run",
        );

    console.error(JSON.stringify({
      setupStatus: "complete",
      fakeTransportTests: "separate-not-run-by-live-command",
      liveExecutionStatus: safeError.liveExecutionStatus,
      browserExecutionStatus: "not-run",
      error: { code: safeError.code, message: safeError.message },
    }));
    process.exitCode = 1;
  }
}
