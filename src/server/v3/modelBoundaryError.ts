export type ModelBoundaryFailureCode =
  | "rate-limited"
  | "model-unavailable"
  | "invalid-model-output";

export class ModelBoundaryError extends Error {
  readonly failureCode: ModelBoundaryFailureCode;

  constructor(failureCode: ModelBoundaryFailureCode, message: string) {
    super(message);
    this.name = "ModelBoundaryError";
    this.failureCode = failureCode;
  }
}
