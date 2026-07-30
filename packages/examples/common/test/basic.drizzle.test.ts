import { createClient } from "@libsql/client";
import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { drizzleFraci } from "fraci/drizzle";
import { fiTestItems, testItems } from "../src/schema.js";
import { createMemoryDbUrl } from "../test-utils.js";

test("drizzle basic functionality", async () => {
  const client = createClient({
    url: createMemoryDbUrl(),
  });

  const db = drizzle(client);

  // Create table
  await db.run(sql`
    CREATE TABLE test_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fi TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX group_id_fi_idx ON test_item(group_id, fi)
  `);

  try {
    // Create fraci fetcher
    const fraciDB = drizzleFraci(db, fiTestItems);

    // Test basic insertion and ordering
    const indices1 = await fraciDB.indicesForFirst({ groupId: 1 });
    const [fi1] = fraciDB.generateKeyBetween(indices1[0], indices1[1]);
    const item1 = await db
      .insert(testItems)
      .values({
        name: "First Item",
        groupId: 1,
        fi: fi1,
      })
      .returning();

    const indices2 = await fraciDB.indicesForAfter(
      { groupId: 1 },
      { id: item1[0].id },
    );
    const [fi2] = fraciDB.generateKeyBetween(indices2[0], indices2[1]);
    const item2 = await db
      .insert(testItems)
      .values({
        name: "Second Item",
        groupId: 1,
        fi: fi2,
      })
      .returning();

    expect(item1[0].fi).toBeDefined();
    expect(item2[0].fi).toBeDefined();
    expect(item1[0].fi < item2[0].fi).toBe(true);

    const items = await db
      .select()
      .from(testItems)
      .where(eq(testItems.groupId, 1))
      .orderBy(testItems.fi);

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("First Item");
    expect(items[1].name).toBe("Second Item");
  } finally {
    client.close();
  }
});
