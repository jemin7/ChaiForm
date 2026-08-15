import { connectDatabase } from "@repo/database";

export async function assertDatabaseConnection() {
  const mongoose = await connectDatabase();
  await mongoose.connection.db?.command({ ping: 1 });
}

export { connectDatabase };
