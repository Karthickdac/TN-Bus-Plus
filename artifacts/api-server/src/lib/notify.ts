import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";

type Executor = Pick<typeof db, "insert">;

export async function createNotification(input: {
  passengerId: number;
  type: string;
  title: string;
  body: string;
  dedupeKey?: string;
}, executor: Executor = db) {
  const [row] = await executor.insert(notificationsTable).values({
    passengerId: input.passengerId,
    type: input.type,
    title: input.title,
    body: input.body,
    dedupeKey: input.dedupeKey ?? null,
  }).returning();
  return row;
}
