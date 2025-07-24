import { asc, desc, eq, gte, isNull, lte, sql, type Column } from "drizzle-orm";
import type { AnyFractionalIndex as AFI } from "../lib/types.js";

/**
 * Creates a SQL condition for equality comparison that safely handles null and undefined values.
 *
 * This function provides a more robust equality check than the standard `eq` operator:
 * - For non-null values: uses standard equality check
 * - For null values: uses `isNull` check
 * - For undefined values: returns FALSE (security measure for missing values)
 *
 * @param column - The database column to compare
 * @param value - The value to compare against (can be any type including null/undefined)
 * @returns A SQL condition for use in database queries
 */
export function equity(column: Column, value: unknown) {
  return value != null
    ? eq(column, value)
    : value === null
      ? // Use `isNull` if value is `null`
        isNull(column)
      : // SECURITY: Always return `FALSE` if value is `undefined`, meaning it's missing
        sql`FALSE`;
}

/**
 * Array of operator tuples for handling ascending and descending order operations.
 * Each tuple contains three elements:
 * 1. A sort function (asc or desc) for ordering query results
 * 2. A comparison operator (gte or lte) for filtering
 * 3. A function that transforms bound parameters based on sort direction
 *
 * This constant is used to abstract the differences between ascending and
 * descending operations when working with fractional indices.
 */
export const OPERATORS = [
  [
    asc,
    gte,
    (a: AFI | null, b: AFI | null): [AFI | null, AFI | null] => [a, b],
  ],
  [
    desc,
    lte,
    (a: AFI | null, b: AFI | null): [AFI | null, AFI | null] => [b, a],
  ],
] as const;
