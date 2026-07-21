import { reactStateOwnershipQuestion } from "../src/domain/v3/questionContent.ts";
import {
  createOpenAICall1ModelBoundaryFromEnvironment,
} from "../src/server/v3/openaiDiagnosisClient.ts";
import {
  runInitialDiagnosisPipeline,
} from "../src/server/v3/diagnosisPipeline.ts";

const invokeModel = createOpenAICall1ModelBoundaryFromEnvironment(process.env);
const success = await runInitialDiagnosisPipeline(
  {
    contractVersion: "1",
    questionId: reactStateOwnershipQuestion.id,
    questionVersion: reactStateOwnershipQuestion.version,
    answer:
      "App should own selectedQuestionId, pass it to the navigator, and derive the selected question so children do not keep competing copies.",
  },
  invokeModel,
);

console.log(
  JSON.stringify({
    outcome: success.result.outcome,
    modelLatencyMs: success.meta.modelLatencyMs,
    usage: success.meta.usage,
  }),
);
