import { Database } from "bun:sqlite";
import { beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { BASE36 } from "../bases.js";
import { fraci } from "../factory.js";
import type { FractionalIndexOf } from "../types.js";
import { drizzleFraciSync } from "./runtime-sync.js";

describe("drizzleFraciSync with group columns", () => {
  type FI = FractionalIndexOf<typeof testFraci>;

  // Define test schema
  const testItems = sqliteTable("test_item", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    fi: text("fi").notNull().$type<FI>(),
    groupId: integer("group_id").notNull(),
  });

  // Create fraci instance
  const testFraci = fraci({
    digitBase: BASE36,
    lengthBase: BASE36,
  });

  // Define fraci config
  const fiTestItems = {
    fraci: testFraci,
    table: testItems,
    column: testItems.fi,
    cursor: { id: testItems.id },
    group: { groupId: testItems.groupId },
  };

  // Setup in-memory database
  const db = drizzle(new Database(":memory:"));

  const fetcher = drizzleFraciSync(db, fiTestItems);

  beforeAll(() => {
    // Create schema
    db.run(sql`
      CREATE TABLE test_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fi TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        UNIQUE(group_id, fi)
      )
    `);

    // Insert test data
    db.insert(testItems)
      .values([
        { name: "Item 1 (Group 1)", fi: "a" as FI, groupId: 1 },
        { name: "Item 2 (Group 1)", fi: "m" as FI, groupId: 1 },
        { name: "Item 3 (Group 1)", fi: "z" as FI, groupId: 1 },
        { name: "Item 1 (Group 2)", fi: "b" as FI, groupId: 2 },
        { name: "Item 2 (Group 2)", fi: "n" as FI, groupId: 2 },
      ])
      .run();
  });

  test("should return a DrizzleFraciFetcherSync with correct methods", () => {
    expect(fetcher).toHaveProperty("indicesForAfter");
    expect(fetcher).toHaveProperty("indicesForBefore");
    expect(fetcher).toHaveProperty("indicesForFirst");
    expect(fetcher).toHaveProperty("indicesForLast");

    expect(typeof fetcher.indicesForAfter).toBe("function");
    expect(typeof fetcher.indicesForBefore).toBe("function");
    expect(typeof fetcher.indicesForFirst).toBe("function");
    expect(typeof fetcher.indicesForLast).toBe("function");
  });

  test("indicesForFirst should return correct indices", () => {
    const indices = fetcher.indicesForFirst({ groupId: 1 });

    expect(indices).toBeArrayOfSize(2);
    expect(indices[0]).toBeNull();
    expect(indices[1]).toBe("a" as FI);
  });

  test("indicesForLast should return correct indices", () => {
    const indices = fetcher.indicesForLast({ groupId: 1 });

    expect(indices).toBeArrayOfSize(2);
    expect(indices[0]).toBe("z" as FI);
    expect(indices[1]).toBeNull();
  });

  test("indicesForAfter should return correct indices with cursor", () => {
    // Get the first item
    const item = db
      .select()
      .from(testItems)
      .where(
        sql`${testItems.groupId} = 1 AND ${testItems.name} = 'Item 1 (Group 1)'`
      )
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    const indices = fetcher.indicesForAfter({ groupId: 1 }, { id: item!.id });

    expect(indices).toBeArrayOfSize(2);
    expect(indices![0]).toBe("a" as FI);
    expect(indices![1]).toBe("m" as FI);
  });

  test("indicesForBefore should return correct indices with cursor", () => {
    // Get the last item
    const item = db
      .select()
      .from(testItems)
      .where(
        sql`${testItems.groupId} = 1 AND ${testItems.name} = 'Item 3 (Group 1)'`
      )
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    const indices = fetcher.indicesForBefore({ groupId: 1 }, { id: item!.id });

    expect(indices).toBeArrayOfSize(2);
    expect(indices![0]).toBe("m" as FI);
    expect(indices![1]).toBe("z" as FI);
  });

  test("should return undefined for non-existent cursor", () => {
    expect(
      fetcher.indicesForAfter({ groupId: 1 }, { id: 999 })
    ).toBeUndefined();
    expect(
      fetcher.indicesForBefore({ groupId: 1 }, { id: 999 })
    ).toBeUndefined();
  });

  test("should return undefined for cursor in different group", () => {
    // Get an item in a different group
    const item = db
      .select()
      .from(testItems)
      .where(
        sql`${testItems.groupId} = 2 AND ${testItems.name} = 'Item 2 (Group 2)'`
      )
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    expect(
      fetcher.indicesForAfter({ groupId: 1 }, { id: item!.id })
    ).toBeUndefined();
    expect(
      fetcher.indicesForBefore({ groupId: 1 }, { id: item!.id })
    ).toBeUndefined();
  });

  test("should handle when group fields missing", () => {
    // @ts-expect-error
    expect(fetcher.indicesForFirst({})).toEqual([null, null]);
    // @ts-expect-error
    expect(fetcher.indicesForLast({})).toEqual([null, null]);

    const item = db
      .select()
      .from(testItems)
      .where(
        sql`${testItems.groupId} = 1 AND ${testItems.name} = 'Item 1 (Group 1)'`
      )
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    expect(
      // @ts-expect-error
      fetcher.indicesForAfter({}, { id: item!.id })
    ).toBeUndefined();
    expect(
      // @ts-expect-error
      fetcher.indicesForBefore({}, { id: item!.id })
    ).toBeUndefined();
  });

  test("should handle when cursor fields missing", () => {
    // @ts-expect-error
    expect(fetcher.indicesForAfter({ groupId: 1 }, {})).toBeUndefined();
    // @ts-expect-error
    expect(fetcher.indicesForBefore({ groupId: 1 }, {})).toBeUndefined();
  });

  test("should handle empty groups", () => {
    const indicesFirst = fetcher.indicesForFirst({ groupId: 999 });
    const indicesLast = fetcher.indicesForLast({ groupId: 999 });

    expect(indicesFirst).toEqual([null, null]);
    expect(indicesLast).toEqual([null, null]);
  });
});

describe("drizzleFraciSync without group columns", () => {
  type FI = FractionalIndexOf<typeof noGroupFraci>;

  // Define test schema with no group column
  const noGroupItems = sqliteTable("no_group_item", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    fi: text("fi").notNull().$type<FI>(),
  });

  // Create fraci instance
  const noGroupFraci = fraci({
    digitBase: BASE36,
    lengthBase: BASE36,
  });

  // Define fraci config with empty group
  const fiNoGroupItems = {
    fraci: noGroupFraci,
    table: noGroupItems,
    column: noGroupItems.fi,
    cursor: { id: noGroupItems.id },
    group: {}, // Empty group configuration
  };

  // Setup in-memory database
  const db = drizzle(new Database(":memory:"));

  const fetcher = drizzleFraciSync(db, fiNoGroupItems);

  beforeAll(() => {
    // Create schema
    db.run(sql`
      CREATE TABLE no_group_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fi TEXT NOT NULL,
        UNIQUE(fi)
      )
    `);

    // Insert test data
    db.insert(noGroupItems)
      .values([
        { name: "Item A", fi: "a" as FI },
        { name: "Item B", fi: "m" as FI },
        { name: "Item C", fi: "z" as FI },
      ])
      .run();
  });

  test("should return a DrizzleFraciFetcherSync with correct methods", () => {
    expect(fetcher).toHaveProperty("indicesForAfter");
    expect(fetcher).toHaveProperty("indicesForBefore");
    expect(fetcher).toHaveProperty("indicesForFirst");
    expect(fetcher).toHaveProperty("indicesForLast");

    expect(typeof fetcher.indicesForAfter).toBe("function");
    expect(typeof fetcher.indicesForBefore).toBe("function");
    expect(typeof fetcher.indicesForFirst).toBe("function");
    expect(typeof fetcher.indicesForLast).toBe("function");
  });

  test("indicesForFirst should return correct indices with empty group", () => {
    const indices = fetcher.indicesForFirst({});

    expect(indices).toBeArrayOfSize(2);
    expect(indices[0]).toBeNull();
    expect(indices[1]).toBe("a" as FI);
  });

  test("indicesForLast should return correct indices with empty group", () => {
    const indices = fetcher.indicesForLast({});

    expect(indices).toBeArrayOfSize(2);
    expect(indices[0]).toBe("z" as FI);
    expect(indices[1]).toBeNull();
  });

  test("indicesForAfter should return correct indices with cursor and empty group", () => {
    // Get the first item
    const item = db
      .select()
      .from(noGroupItems)
      .where(sql`${noGroupItems.name} = 'Item A'`)
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    const indices = fetcher.indicesForAfter({}, { id: item!.id });

    expect(indices).toBeArrayOfSize(2);
    expect(indices![0]).toBe("a" as FI);
    expect(indices![1]).toBe("m" as FI);
  });

  test("indicesForBefore should return correct indices with cursor and empty group", () => {
    // Get the last item
    const item = db
      .select()
      .from(noGroupItems)
      .where(sql`${noGroupItems.name} = 'Item C'`)
      .limit(1)
      .get();
    expect(item).not.toBeUndefined();

    const indices = fetcher.indicesForBefore({}, { id: item!.id });

    expect(indices).toBeArrayOfSize(2);
    expect(indices![0]).toBe("m" as FI);
    expect(indices![1]).toBe("z" as FI);
  });

  test("should return undefined for non-existent cursor with empty group", () => {
    expect(fetcher.indicesForAfter({}, { id: 999 })).toBeUndefined();
    expect(fetcher.indicesForBefore({}, { id: 999 })).toBeUndefined();
  });

  test("should handle when cursor fields missing with empty group", () => {
    // @ts-expect-error
    expect(fetcher.indicesForAfter({}, {})).toBeUndefined();
    // @ts-expect-error
    expect(fetcher.indicesForBefore({}, {})).toBeUndefined();
  });
});
