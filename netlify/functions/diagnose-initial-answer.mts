import type { Context } from "@netlify/functions";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { resolveAiProvider } from "../../src/server/v3/aiProvider.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createDiagnoseInitialAnswerHttpHandler } from "../../src/server/v3/diagnoseInitialAnswerHttp.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createLmStudioCall1ModelBoundaryFromEnvironment } from "../../src/server/v3/lmStudioDiagnosisClient.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createOpenAICall1ModelBoundaryFromEnvironment } from "../../src/server/v3/openaiDiagnosisClient.ts";

const handleRequest = createDiagnoseInitialAnswerHttpHandler({
  createModelBoundary: () => {
    const resolution = resolveAiProvider(process.env);

    if (resolution.provider === "lm-studio") {
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
