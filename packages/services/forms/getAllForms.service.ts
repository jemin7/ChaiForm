import { FormModel, ResponseModel, toForm } from "@repo/database";

export async function getAllForms(userId: string) {
  const forms = await FormModel.find({ userId }).sort({ updatedAt: -1 }).select({ fields: 0 }).lean();

  const ids = forms.map((form) => form._id);

  const [counts, fieldCounts] = await Promise.all([
    ResponseModel.aggregate<{ _id: string; count: number }>([
      { $match: { formId: { $in: ids } } },
      { $group: { _id: "$formId", count: { $sum: 1 } } },
    ]),
    FormModel.aggregate<{ _id: string; count: number }>([
      { $match: { _id: { $in: ids } } },
      { $project: { count: { $size: { $ifNull: ["$fields", []] } } } },
    ]),
  ]);

  const countsById = new Map(counts.map((count) => [count._id, count.count]));
  const fieldCountsById = new Map(fieldCounts.map((count) => [count._id, count.count]));

  return forms.map((form) => ({
    ...toForm(form),
    responseCount: countsById.get(form._id) ?? 0,
    fieldCount: fieldCountsById.get(form._id) ?? 0,
  }));
}
