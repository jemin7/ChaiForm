export function sanitizeCallbackUrl(value: string | undefined, fallback = "/dashboard"): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}
