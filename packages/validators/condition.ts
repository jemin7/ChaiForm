import type { AnswerValue } from "./submitResponse.schema";

export function isAnswerEmpty(value: AnswerValue): boolean {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}
