import type { Context } from "@netlify/functions";
// @ts-expect-error Netlify bundles the TypeScript source extension.
import { createAiRuntimeStatusHttpHandler } from "../../src/server/v3/aiRuntimeStatusHttp.ts";

const handleRequest = createAiRuntimeStatusHttpHandler({
  environment: process.env,
});

export default async function handler(
  request: Request,
  _context: Context,
): Promise<Response> {
  return handleRequest(request);
}
