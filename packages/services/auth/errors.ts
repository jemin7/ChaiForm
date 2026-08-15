export class AuthServiceError extends Error {
  public constructor(
    message: string,
    public readonly code: "DUPLICATE_EMAIL" | "INVALID_CREDENTIALS",
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}
