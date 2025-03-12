import { asc, desc, eq, gte, isNull, lte, sql, type Column } from "drizzle-orm";
import type { AnyFractionalIndex as AFI } from "../types.js";

export function equity(column: Column, value: unknown) {
  return value != null
    ? eq(column, value)
    : value === null
    ? // Use `isNull` if value is `null`
      isNull(column)
    : // SECURITY: Always return `FALSE` if value is `undefined`, meaning it's missing
      sql`FALSE`;
}

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
