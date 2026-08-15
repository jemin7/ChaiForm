import { randomUUID } from "node:crypto";
import mongoose, { type Model } from "mongoose";

export interface ResponseFileValue {
  name: string;
  type: string;
  size: number;
  data: string;
}

export type AnswerValue = string | number | boolean | string[] | ResponseFileValue | null;

export interface ResponseAnswer {
  fieldId: string;
  value: AnswerValue;
}

/** Raw embedded answer document shape. */
export interface ResponseAnswerLean {
  _id: string;
  fieldId: string;
  value: AnswerValue;
}

export interface Response {
  id: string;
  formId: string;
  submittedAt: Date;
  answers: ResponseAnswer[];
}

/** Raw response document shape (as returned by lean queries / toObject). */
export interface ResponseLean {
  _id: string;
  formId: string;
  submittedAt: Date;
  answers: ResponseAnswerLean[];
}

const responseAnswerSchema = new mongoose.Schema<ResponseAnswerLean>(
  {
    _id: { type: String, default: randomUUID },
    fieldId: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { versionKey: false },
);

const responseSchema = new mongoose.Schema<ResponseLean>(
  {
    _id: { type: String, default: randomUUID },
    formId: { type: String, required: true },
    submittedAt: { type: Date, default: () => new Date() },
    answers: { type: [responseAnswerSchema], default: [] },
  },
  { versionKey: false },
);

responseSchema.index({ formId: 1, submittedAt: -1 });

export const ResponseModel =
  (mongoose.models.Response as Model<ResponseLean> | undefined) ??
  mongoose.model<ResponseLean>("Response", responseSchema);

export function toResponse(doc: ResponseLean): Response {
  return {
    id: doc._id,
    formId: doc.formId,
    submittedAt: doc.submittedAt,
    answers: doc.answers.map((answer) => ({
      fieldId: answer.fieldId,
      value: answer.value,
    })),
  };
}
