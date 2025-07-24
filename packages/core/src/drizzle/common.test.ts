import { describe, expect, test } from "bun:test";
import { eq, isNull, sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AnyFractionalIndex as AFI } from "../types.js";
import { equity, OPERATORS } from "./common.js";

// Create a proper column for testing
const testTable = sqliteTable("test_table", {
  id: text("id").primaryKey(),
  testColumn: text("test_column").notNull(),
});

describe("equity", () => {
  const column = testTable.testColumn;

  test("should return eq when value is not null or undefined", () => {
    const result = equity(column, "value");
    expect(result).toEqual(eq(column, "value"));
  });

  test("should return isNull when value is null", () => {
    const result = equity(column, null);
    expect(result).toEqual(isNull(column));
  });

  test("should return FALSE when value is undefined", () => {
    const result = equity(column, undefined);
    expect(result).toEqual(sql`FALSE`);
  });
});

describe("OPERATORS", () => {
  test("should have correct structure", () => {
    expect(OPERATORS).toBeArrayOfSize(2);

    // First operator (asc)
    expect(OPERATORS[0]).toBeArrayOfSize(3);
    expect(OPERATORS[0][0].name).toBe("asc");
    expect(OPERATORS[0][1].name).toBe("gte");
    expect(typeof OPERATORS[0][2]).toBe("function");

    // Second operator (desc)
    expect(OPERATORS[1]).toBeArrayOfSize(3);
    expect(OPERATORS[1][0].name).toBe("desc");
    expect(OPERATORS[1][1].name).toBe("lte");
    expect(typeof OPERATORS[1][2]).toBe("function");
  });

  test("asc operator tuple function should maintain order", () => {
    // Mock fractional indices with strings for testing
    const a = "a" as AFI;
    const b = "b" as AFI;

    const [result1, result2] = OPERATORS[0][2](a, b);
    expect(result1).toBe(a);
    expect(result2).toBe(b);
  });

  test("desc operator tuple function should reverse order", () => {
    // Mock fractional indices with strings for testing
    const a = "a" as AFI;
    const b = "b" as AFI;

    const [result1, result2] = OPERATORS[1][2](a, b);
    expect(result1).toBe(b);
    expect(result2).toBe(a);
  });

  test("operators should handle null values correctly", () => {
    // Mock fractional index with string for testing
    const a = "a" as AFI;

    const [result1, result2] = OPERATORS[0][2](a, null);
    expect(result1).toBe(a);
    expect(result2).toBeNull();

    const [result3, result4] = OPERATORS[1][2](null, a);
    expect(result3).toBe(a);
    expect(result4).toBeNull();
  });
});
