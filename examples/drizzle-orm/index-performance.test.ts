import { expect, test } from "bun:test";
import { and, asc, desc, gte, lte, SQL, sql } from "drizzle-orm";
import { drizzleFraci } from "fraci/drizzle";
import { exampleItems, fiExampleItems } from "../../drizzle/schema.js";
import { setupDrizzleDBLibSQL } from "../../test/drizzle.js";

test("Ensure that the query plan is optimal", async () => {
  const NUM_GROUPS = 10;
  const NUM_ITEMS_PER_GROUP = 1000;
  const GROUP_ID_START = 1000;

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
        }))
      )
      .execute();
  }

  // explain query
  const groupId = GROUP_ID_START + 3;
  const cursorId = (
    await db.query.exampleItems.findFirst({
      columns: { id: true },
      where: sql`${exampleItems.groupId} = ${groupId} AND ${
        exampleItems.name
      } = ${"Item 400"}`,
    })
  )?.id;
  if (!cursorId) {
    throw new Error("TEST: Item not found");
  }

  async function explain(query: SQL): Promise<string[]> {
    return (await db.run(sql`EXPLAIN QUERY PLAN ${query}`)).rows.map(
      (r) => r["detail"]
    ) as string[];
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
      sql`${exampleItems.id} = ${cursorId}`
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

    const explained = await explain(query.getSQL());
    console.log(
      `EXPLAIN Select ${name}:\n${explained
        .map((item, index) => `${index + 1}. ${item}\n`)
        .join("")}`
    );
    expect(explained.some((item) => item.includes("group_id_fi_idx"))).toBe(
      true
    );

    const listQuery = db
      .select(fiSelector)
      .from(table)
      .where(and(...groupConditions))
      .orderBy(order(column));

    const listExplained = await explain(listQuery.getSQL());
    console.log(
      `EXPLAIN List ${name}:\n${listExplained
        .map((item, index) => `${index + 1}. ${item}\n`)
        .join("")}`
    );
    expect(listExplained.some((item) => item.includes("group_id_fi_idx"))).toBe(
      true
    );
  }
});
