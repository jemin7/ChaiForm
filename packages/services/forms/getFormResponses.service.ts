import { ResponseModel } from "@repo/database";

import { getOwnedFormOrThrow } from "./helpers";

export interface FormResponseFile {
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface FormResponseAnswer {
  fieldId: string;
  label: string;
  type: string;
  value: string | number | boolean | string[] | FormResponseFile | null;
}

export interface FormResponseEntry {
  id: string;
  submittedAt: Date;
  answers: FormResponseAnswer[];
}

export interface ResponsePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GetFormResponsesOptions {
  page?: number;
  pageSize?: number;
}

/** Maximum responses returned in unpaginated mode (used by AI summary). */
const MAX_UNPAGINATED = 1000;

/**
 * Fetch responses for a form, newest first. Pass `page`/`pageSize` to
 * paginate; omit them to load responses up to a safe cap (used by the
 * AI summary — loading every response into memory is unsafe for forms
 * with thousands of submissions).
 */
export async function getFormResponses(
  userId: string,
  formId: string,
  options: GetFormResponsesOptions = {},
) {
  const form = await getOwnedFormOrThrow(formId, userId);
  const fieldsById = new Map((form.fields ?? []).map((field) => [field.id, field]));

  const total = await ResponseModel.countDocuments({ formId: form.id });

  const paginated = options.page != null || options.pageSize != null;
  const page = paginated ? Math.max(1, options.page ?? 1) : 1;
  const pageSize = paginated
    ? Math.min(50, Math.max(1, options.pageSize ?? 10))
    : Math.min(MAX_UNPAGINATED, Math.max(1, total));

  const query = ResponseModel.find({ formId: form.id }).sort({ submittedAt: -1 });
  const responses = paginated ? await query.skip((page - 1) * pageSize).limit(pageSize).lean() : await query.limit(pageSize).lean();

  return {
    form: {
      id: form.id,
      title: form.title,
      slug: form.slug,
      isPublished: form.isPublished,
      visibility: form.visibility,
    },
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    responses: responses.map((response) => ({
      id: response._id,
      submittedAt: response.submittedAt,
      answers: response.answers
        .slice()
        .sort(
          (a, b) =>
            (fieldsById.get(a.fieldId)?.order ?? 0) - (fieldsById.get(b.fieldId)?.order ?? 0),
        )
        .map((answer) => {
          const field = fieldsById.get(answer.fieldId);

          return {
            fieldId: answer.fieldId,
            label: field?.label ?? "Untitled field",
            type: field?.type ?? "text",
            value: answer.value,
          };
        }),
    })),
  };
}
