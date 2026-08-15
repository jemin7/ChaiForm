import { ResponseModel, type AnswerValue } from "@repo/database";
import { isAnswerEmpty } from "@repo/validators/condition";

import { getOwnedFormOrThrow } from "./helpers";

export const ANALYTICS_DAYS = 14;

export interface FormAnalyticsOptionCount {
  option: string;
  count: number;
}

export interface FormAnalyticsRatingCount {
  rating: number;
  count: number;
}

export interface FormAnalyticsField {
  fieldId: string;
  label: string;
  type: string;
  answerCount: number;
  options?: FormAnalyticsOptionCount[];
  ratingDistribution?: FormAnalyticsRatingCount[];
  averageRating?: number | null;
}

export interface FormAnalytics {
  form: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    visibility: string;
  };
  totalResponses: number;
  responsesOverTime: Array<{ date: string; count: number }>;
  fields: FormAnalyticsField[];
}

export async function getFormAnalytics(userId: string, formId: string): Promise<FormAnalytics> {
  const form = await getOwnedFormOrThrow(formId, userId);
  const fields = form.fields ?? [];

  const totalResponses = await ResponseModel.countDocuments({ formId: form.id });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (ANALYTICS_DAYS - 1));

  const dailyRows = await ResponseModel.aggregate<{ _id: string; count: number }>([
    { $match: { formId: form.id, submittedAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyCounts = new Map(dailyRows.map((row) => [row._id, row.count]));

  const responsesOverTime = Array.from({ length: ANALYTICS_DAYS }).map((_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      count: dailyCounts.get(key) ?? 0,
    };
  });

  const answerDocs = await ResponseModel.find({ formId: form.id }, { answers: 1 }).lean();

  const answersByField = new Map<string, AnswerValue[]>();

  for (const doc of answerDocs) {
    for (const answer of doc.answers) {
      const values = answersByField.get(answer.fieldId) ?? [];
      values.push(answer.value);
      answersByField.set(answer.fieldId, values);
    }
  }

  const breakdowns = fields.map((field) => {
    const values = answersByField.get(field.id) ?? [];
    const answered = values.filter((value) => !isAnswerEmpty(value));

    const breakdown: FormAnalyticsField = {
      fieldId: field.id,
      label: field.label,
      type: field.type,
      answerCount: answered.length,
    };

    if (field.type === "select" || field.type === "checkbox") {
      const counts = new Map<string, number>();

      for (const value of answered) {
        if (Array.isArray(value)) {
          for (const option of value) {
            counts.set(option, (counts.get(option) ?? 0) + 1);
          }
        } else if (typeof value === "string") {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }

      breakdown.options = [...counts.entries()]
        .map(([option, count]) => ({ option, count }))
        .sort((a, b) => b.count - a.count);
    } else if (field.type === "rating") {
      const ratings = answered.filter((value): value is number => typeof value === "number");
      const distribution = new Map<number, number>();

      for (const rating of ratings) {
        distribution.set(rating, (distribution.get(rating) ?? 0) + 1);
      }

      breakdown.ratingDistribution = Array.from({ length: 5 }).map((_, index) => ({
        rating: index + 1,
        count: distribution.get(index + 1) ?? 0,
      }));

      breakdown.averageRating = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;
    }

    return breakdown;
  });

  return {
    form: {
      id: form.id,
      title: form.title,
      slug: form.slug,
      isPublished: form.isPublished,
      visibility: form.visibility,
    },
    totalResponses,
    responsesOverTime,
    fields: breakdowns,
  };
}
