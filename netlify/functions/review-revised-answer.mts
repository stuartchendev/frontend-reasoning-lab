import type { Context } from "@netlify/functions";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createOpenAICall2ModelBoundaryFromEnvironment } from "../../src/server/v3/openaiRevisionReviewClient.ts";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createReviewRevisedAnswerHttpHandler } from "../../src/server/v3/reviewRevisedAnswerHttp.ts";

const handleRequest = createReviewRevisedAnswerHttpHandler({
  createModelBoundary: () =>
    createOpenAICall2ModelBoundaryFromEnvironment(process.env),
});

export default async function handler(
  request: Request,
  _context: Context,
): Promise<Response> {
  return handleRequest(request);
}
