export class FormServiceError extends Error {
  public constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "SLUG_TAKEN" | "INVALID_FIELDS",
  ) {
    super(message);
    this.name = "FormServiceError";
  }
}
