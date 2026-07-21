import type {
  ReviewRevisedAnswerRequest,
  ReviewRevisedAnswerResponse,
} from "../../domain/v3/revisionReviewApi";
// @ts-expect-error Node's native TypeScript loader requires the .ts extension.
import { parseReviewRevisedAnswerResponse } from "../../domain/v3/revisionReviewApi.ts";

const REVIEW_REVISED_ANSWER_ENDPOINT =
  "/.netlify/functions/review-revised-answer";

export type ReviewRevisedAnswerFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export type ReviewRevisedAnswerService = (
  request: ReviewRevisedAnswerRequest,
) => Promise<ReviewRevisedAnswerResponse>;

export class ReviewRevisedAnswerServiceError extends Error {
  constructor() {
    super("The revision-review service returned an invalid response.");
    this.name = "ReviewRevisedAnswerServiceError";
  }
}

function defaultFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init);
}

function failService(): never {
  throw new ReviewRevisedAnswerServiceError();
}

export function createReviewRevisedAnswerService(
  fetchImplementation: ReviewRevisedAnswerFetch = defaultFetch,
): ReviewRevisedAnswerService {
  return async (request) => {
    try {
      const response = await fetchImplementation(
        REVIEW_REVISED_ANSWER_ENDPOINT,
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
      const parsedResponse = parseReviewRevisedAnswerResponse(rawResponse);

      if (response.ok !== parsedResponse.ok) {
        return failService();
      }

      return parsedResponse;
    } catch {
      return failService();
    }
  };
}
