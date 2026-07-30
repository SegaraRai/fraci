import { createClient } from "@libsql/client";
import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { drizzleFraci } from "fraci/drizzle";
import { fiTestItems, testItems } from "../src/schema.js";

test("drizzle basic functionality", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle({ client });

  await db.run(sql`
    CREATE TABLE test_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fi TEXT NOT NULL,
      group_id INTEGER NOT NULL
    )
  `);
  await db.run(sql`
    CREATE UNIQUE INDEX group_id_fi_idx ON test_item(group_id, fi)
  `);

  try {
    const helper = drizzleFraci(db, fiTestItems);
    const firstPair = await helper.indicesForFirst({ groupId: 1 });
    const [fi1] = helper.generateKeyBetween(...firstPair);
    const [item1] = await db
      .insert(testItems)
      .values({ name: "First Item", groupId: 1, fi: fi1 })
      .returning();

    const secondPair = await helper.indicesForAfter(
      { groupId: 1 },
      { id: item1.id }
    );
    expect(secondPair).toBeDefined();
    if (!secondPair) throw new Error("Expected adjacent indices");
    const [fi2] = helper.generateKeyBetween(...secondPair);
    await db
      .insert(testItems)
      .values({ name: "Second Item", groupId: 1, fi: fi2 });

    const items = await db
      .select()
      .from(testItems)
      .where(eq(testItems.groupId, 1))
      .orderBy(testItems.fi);
    expect(items.map(({ name }) => name)).toEqual([
      "First Item",
      "Second Item",
    ]);
  } finally {
    client.close();
  }
});
