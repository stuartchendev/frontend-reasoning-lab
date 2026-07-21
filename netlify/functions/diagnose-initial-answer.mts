import type { Context } from "@netlify/functions";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createDiagnoseInitialAnswerHttpHandler } from "../../src/server/v3/diagnoseInitialAnswerHttp.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createOpenAICall1ModelBoundaryFromEnvironment } from "../../src/server/v3/openaiDiagnosisClient.ts";

const handleRequest = createDiagnoseInitialAnswerHttpHandler({
  createModelBoundary: () =>
    createOpenAICall1ModelBoundaryFromEnvironment(process.env),
});

export default async function handler(
  request: Request,
  _context: Context,
): Promise<Response> {
  return handleRequest(request);
}
