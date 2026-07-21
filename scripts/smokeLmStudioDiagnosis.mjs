import { parseInitialDiagnosisResult } from "../src/domain/v3/evaluationResults.ts";
import { reactStateOwnershipQuestion } from "../src/domain/v3/questionContent.ts";
import {
  LmStudioCall1ConfigurationError,
  LmStudioCall1ResponseError,
  createLmStudioCall1ModelBoundaryFromEnvironment,
} from "../src/server/v3/lmStudioDiagnosisClient.ts";
import {
  OpenAICall1ResponseError,
} from "../src/server/v3/openaiDiagnosisClient.ts";
import {
  DiagnosisPipelineError,
  getCanonicalDiagnosisContext,
  runInitialDiagnosisPipeline,
} from "../src/server/v3/diagnosisPipeline.ts";
import { validateInitialDiagnosisResult } from "../src/server/v3/evaluation.ts";

const request = {
  contractVersion: "1",
  questionId: reactStateOwnershipQuestion.id,
  questionVersion: reactStateOwnershipQuestion.version,
  answer:
    "The navigator should keep its own selected question state so it can update independently.",
};

let observedInput;
let observedOutput;
let boundaryFailureStage;

try {
  const localBoundary =
    createLmStudioCall1ModelBoundaryFromEnvironment(process.env);
  const observedBoundary = async (input) => {
    observedInput = input;

    try {
      const invocation = await localBoundary(input);
      observedOutput = invocation.output;
      return invocation;
    } catch (error) {
      boundaryFailureStage =
        error instanceof LmStudioCall1ResponseError ||
        error instanceof OpenAICall1ResponseError
          ? "structured-output"
          : "transport";
      throw error;
    }
  };
  const success = await runInitialDiagnosisPipeline(
    request,
    observedBoundary,
  );

  console.log(
    JSON.stringify({
      outcome: success.result.outcome,
      modelLatencyMs: success.meta.modelLatencyMs,
      usage: success.meta.usage,
    }),
  );
} catch (error) {
  let failureStage = "unexpected";

  if (error instanceof LmStudioCall1ConfigurationError) {
    failureStage = "configuration";
  } else if (
    error instanceof DiagnosisPipelineError &&
    error.failure.code === "model-unavailable"
  ) {
    failureStage = boundaryFailureStage ?? "transport";
  } else if (
    error instanceof DiagnosisPipelineError &&
    error.failure.code === "invalid-model-output" &&
    observedInput
  ) {
    try {
      const parsed = parseInitialDiagnosisResult(observedOutput);
      const context = getCanonicalDiagnosisContext(request.questionId);
      validateInitialDiagnosisResult(parsed, {
        spec: context.evaluationSpec,
        normalizedAnswer: observedInput.learnerSubmission.normalizedAnswer,
      });
      failureStage = "validation";
    } catch (validationError) {
      try {
        parseInitialDiagnosisResult(observedOutput);
        failureStage = "semantic-validation";
      } catch {
        failureStage = "structural-validation";
      }
    }
  } else if (error instanceof DiagnosisPipelineError) {
    failureStage = error.failure.code;
  } else if (error instanceof Error) {
    failureStage = error.name;
  }

  console.error(JSON.stringify({ failureStage }));
  process.exitCode = 1;
}
