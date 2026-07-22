import type { Context } from "@netlify/functions";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createDiagnoseInitialAnswerHttpHandler } from "../../src/server/v3/diagnoseInitialAnswerHttp.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createLmStudioCall1ModelBoundaryFromEnvironment } from "../../src/server/v3/lmStudioDiagnosisClient.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createOpenAICall1ModelBoundaryFromEnvironment } from "../../src/server/v3/openaiDiagnosisClient.ts";

const handleRequest = createDiagnoseInitialAnswerHttpHandler({
  createModelBoundary: () => {
    if (process.env.LM_STUDIO_BASE_URL || process.env.LM_STUDIO_MODEL) {
      return createLmStudioCall1ModelBoundaryFromEnvironment(process.env);
    }

    return createOpenAICall1ModelBoundaryFromEnvironment(process.env);
  },
});

export default async function handler(
  request: Request,
  _context: Context,
): Promise<Response> {
  return handleRequest(request);
}
