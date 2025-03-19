import { describe, expect, test } from "bun:test";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { BASE36L } from "../bases.js";
import { fraci } from "../factory.js";
import type { FractionalIndex } from "../types.js";
import { defineDrizzleFraci } from "./schema.js";

describe("defineDrizzleFraci", () => {
  test("should correctly define a DrizzleFraciConfig", () => {
    // Create a test table
    const testTable = sqliteTable("test_table", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      fi: text("fi").notNull().$type<
        FractionalIndex<
          {
            readonly type: "string";
            readonly lengthBase: typeof BASE36L;
            readonly digitBase: typeof BASE36L;
          },
          "_"
        >
      >(),
    });

    // Create a fraci instance
    const testFraci = fraci({
      digitBase: BASE36L,
      lengthBase: BASE36L,
    });

    // Define cursor and group
    const cursor = { id: testTable.id };
    const group = { name: testTable.name };

    // Define DrizzleFraciConfig
    const config = defineDrizzleFraci(
      testFraci,
      testTable,
      testTable.fi,
      group,
      cursor
    );

    // Verify the config structure
    expect(config).toEqual({
      fraci: testFraci,
      table: testTable,
      column: testTable.fi,
      cursor,
      group,
    });

    // Verify individual properties
    expect(config.fraci).toBe(testFraci);
    expect(config.table).toBe(testTable);
    expect(config.column).toBe(testTable.fi);
    expect(config.cursor).toBe(cursor);
    expect(config.group).toBe(group);

    // Type check - should error if the column is not a fractional index type
    defineDrizzleFraci(
      testFraci,
      testTable,
      // @ts-expect-error
      testTable.name,
      group,
      cursor
    );

    // Type check - should error if the fractional index is not the same as the fraci instance
    defineDrizzleFraci(
      fraci({
        brand: "",
        lengthBase: BASE36L,
        digitBase: BASE36L,
      }),
      testTable,
      // @ts-expect-error
      testTable.fi,
      group,
      cursor
    );
  });
});
