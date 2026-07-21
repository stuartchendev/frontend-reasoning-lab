import type {
  DiagnoseInitialAnswerRequest,
  DiagnoseInitialAnswerResponse,
} from "../../domain/v3/diagnosisApi";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseDiagnoseInitialAnswerResponse } from "../../domain/v3/diagnosisApi.ts";

const DIAGNOSE_INITIAL_ANSWER_ENDPOINT =
  "/.netlify/functions/diagnose-initial-answer";

export type DiagnoseInitialAnswerFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export type DiagnoseInitialAnswerService = (
  request: DiagnoseInitialAnswerRequest,
) => Promise<DiagnoseInitialAnswerResponse>;

export class DiagnoseInitialAnswerServiceError extends Error {
  constructor() {
    super("The diagnosis service returned an invalid response.");
    this.name = "DiagnoseInitialAnswerServiceError";
  }
}

function defaultFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init);
}

function failService(): never {
  throw new DiagnoseInitialAnswerServiceError();
}

export function createDiagnoseInitialAnswerService(
  fetchImplementation: DiagnoseInitialAnswerFetch = defaultFetch,
): DiagnoseInitialAnswerService {
  return async (request) => {
    try {
      const response = await fetchImplementation(
        DIAGNOSE_INITIAL_ANSWER_ENDPOINT,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify(request),
        },
      );
      const rawResponse: unknown = await response.json();
      const parsedResponse = parseDiagnoseInitialAnswerResponse(rawResponse);

      if (response.ok !== parsedResponse.ok) {
        return failService();
      }

      return parsedResponse;
    } catch {
      return failService();
    }
  };
}
