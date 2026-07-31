import { createClient } from "@libsql/client";
import { test } from "vite-plus/test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import type { FractionalIndexOf } from "fraci";
import { drizzleFraci } from "fraci/drizzle";
import { verifyOrderingContract } from "../../common/ordering-contract.js";
import { fiTestItems, testItems } from "../src/schema.js";

test("drizzle basic functionality", async () => {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client);

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
    await verifyOrderingContract<FractionalIndexOf<typeof helper>>({
      generate: ([a, b]) => helper.generateKeyBetween(a, b).next().value!,
      indicesForFirst: (groupId) => helper.indicesForFirst({ groupId }),
      indicesForLast: (groupId) => helper.indicesForLast({ groupId }),
      indicesForAfter: (groupId, id) =>
        helper.indicesForAfter({ groupId }, { id }),
      indicesForBefore: (groupId, id) =>
        helper.indicesForBefore({ groupId }, { id }),
      insert: async (name, groupId, fi) => {
        const [item] = await db
          .insert(testItems)
          .values({ name, groupId, fi })
          .returning();
        return item;
      },
      names: async (groupId) =>
        (
          await db
            .select({ name: testItems.name })
            .from(testItems)
            .where(eq(testItems.groupId, groupId))
            .orderBy(testItems.fi)
        ).map(({ name }) => name),
    });
  } finally {
    client.close();
  }
});
