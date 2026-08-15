import { FormModel, ResponseModel } from "@repo/database";

export interface ResponseActivityEntry {
  date: string;
  count: number;
}

export const ACTIVITY_DAYS = 14;

export async function getResponseActivity(userId: string): Promise<ResponseActivityEntry[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (ACTIVITY_DAYS - 1));

  const formIds = (await FormModel.find({ userId }, { _id: 1 }).lean()).map((form) => form._id);

  const rows = await ResponseModel.aggregate<{ _id: string; count: number }>([
    { $match: { formId: { $in: formIds }, submittedAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const counts = new Map(rows.map((row) => [row._id, row.count]));

  return Array.from({ length: ACTIVITY_DAYS }).map((_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      count: counts.get(key) ?? 0,
    };
  });
}
