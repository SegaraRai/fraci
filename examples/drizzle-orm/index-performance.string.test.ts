import { expect, test } from "bun:test";
import { and, asc, desc, gte, lte, SQL, sql } from "drizzle-orm";
import { drizzleFraci } from "fraci/drizzle";
import {
  exampleItems,
  fiExampleItems,
} from "../../drizzle/schema.e2e-string.js";
import { setupDrizzleDBLibSQL } from "../../test/drizzle.e2e-string.js";

const NUM_GROUPS = 10;
const NUM_ITEMS_PER_GROUP = 5000;
const GROUP_ID_START = 100;

const CURSOR_GROUP = 3;
const CURSOR_ITEM = "Item 400";

test("Ensure that the query plan is optimal (String)", async () => {
  // You can check performance without index by editing `drizzle/migrations.e2e-string/0000_init.sql`.

  const db = await setupDrizzleDBLibSQL();
  const xfi = drizzleFraci(db, fiExampleItems);
  const [keys] = xfi.generateNKeysBetween(null, null, NUM_ITEMS_PER_GROUP);

  // seed data
  for (let i = 0; i < NUM_ITEMS_PER_GROUP; i++) {
    await db
      .insert(exampleItems)
      .values(
        new Array(NUM_GROUPS).fill(0).map((_, j) => ({
          groupId: GROUP_ID_START + j,
          name: `Item ${i + 1}`,
          fi: keys[i],
        })),
      )
      .execute();
  }

  // explain query
  const groupId = GROUP_ID_START + CURSOR_GROUP;
  const cursorId = (
    await db.query.exampleItems.findFirst({
      columns: { id: true },
      where: sql`${exampleItems.groupId} = ${groupId} AND ${exampleItems.name} = ${CURSOR_ITEM}`,
    })
  )?.id;
  if (!cursorId) {
    throw new Error("TEST: Cursor item not found");
  }

  async function explain(query: SQL): Promise<[string[], number]> {
    const explained = (await db.run(sql`EXPLAIN QUERY PLAN ${query}`)).rows.map(
      (r) => r["detail"],
    ) as string[];

    const begin = performance.now();
    await db.run(query);
    const end = performance.now();

    return [explained, end - begin];
  }

  for (const [name, compare, order] of [
    ["asc", gte, asc],
    ["desc", lte, desc],
  ] as const) {
    const table = exampleItems;
    const column = exampleItems.fi;
    const groupConditions = [sql`${exampleItems.groupId} = ${groupId}`];
    const cursorCondition = and(
      ...groupConditions,
      sql`${exampleItems.id} = ${cursorId}`,
    );

    const fiSelector = { v: sql`${column}` };
    const subQueryFIOfCursor = db
      .select(fiSelector)
      .from(table)
      .where(cursorCondition)
      .limit(1);
    const query = db
      .select(fiSelector)
      .from(table)
      .where(and(...groupConditions, compare(column, subQueryFIOfCursor)))
      .limit(2) // We need at most 2 items (the cursor item and one adjacent item)
      .orderBy(order(column));

    const [explained, duration] = await explain(query.getSQL());
    console.log(
      `EXPLAIN Select ${name} (${duration.toFixed(3)}ms):\n${explained
        .map((item, index) => `${index + 1}. ${item}\n`)
        .join("")}`,
    );
    expect(explained.some((item) => item.includes("group_id_fi_idx"))).toBe(
      true,
    );
    expect(explained.every((item) => !item.includes("SCAN"))).toBe(true);

    const listQuery = db
      .select(fiSelector)
      .from(table)
      .where(and(...groupConditions))
      .orderBy(order(column));

    const [listExplained, listDuration] = await explain(listQuery.getSQL());
    console.log(
      `EXPLAIN List ${name} (${listDuration.toFixed(3)}ms):\n${listExplained
        .map((item, index) => `${index + 1}. ${item}\n`)
        .join("")}`,
    );
    expect(listExplained.some((item) => item.includes("group_id_fi_idx"))).toBe(
      true,
    );
    expect(listExplained.every((item) => !item.includes("SCAN"))).toBe(true);
  }
});
