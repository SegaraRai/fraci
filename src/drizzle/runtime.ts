import { and, sql } from "drizzle-orm";
import type { MySqlDatabase } from "drizzle-orm/mysql-core";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { AnyFractionalIndex as AFI } from "../types.js";
import { equity, OPERATORS } from "./common.js";
import type {
  DrizzleFraciConfig,
  DrizzleFraciCursor,
  DrizzleFraciGroup,
  DrizzleFractionalIndex,
} from "./types.js";

/**
 * Union type of supported asynchronous Drizzle database clients.
 * This type includes SQLite (in async API), PostgreSQL, and MySQL database clients
 * that can be used with the fractional indexing functionality.
 */
export type SupportedDrizzleDatabase =
  | BaseSQLiteDatabase<"async", any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>;

/**
 * Internal type that combines all database types for implementation purposes.
 * This type is used to access common methods across different database clients
 * without having to handle each database type separately.
 */
type NarrowDatabase = BaseSQLiteDatabase<"async", any, any> &
  PgDatabase<any, any, any> &
  MySqlDatabase<any, any, any, any>;

/**
 * Internal function to retrieve indices for positioning items.
 * This function queries the database to find the appropriate indices
 * for inserting an item before or after a specified cursor position.
 *
 * @param client - The Drizzle database client
 * @param config - The fractional indexing configuration
 * @param group - The group context for the indices
 * @param cursor - The cursor position, or null for first/last position
 * @param reverse - Whether to retrieve indices in reverse order
 * @returns A tuple of indices, or undefined if the cursor doesn't exist
 */
async function indicesFor(
  client: SupportedDrizzleDatabase,
  {
    group: groupConfig,
    cursor: cursorConfig,
    column,
    table,
  }: DrizzleFraciConfig,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  reverse: boolean
): Promise<[AFI | null, AFI | null] | undefined> {
  const [order, compare, tuple] = OPERATORS[Number(reverse)];
  const fiSelector = { v: sql<AFI>`${column}` };

  // SECURITY: Always use config for `Object.entries` so that all fields are included
  const groupConditions = Object.entries(groupConfig).map(([key, column]) =>
    equity(column, group[key])
  );

  // Case 1: No cursor provided - get the first/last item in the group
  // This is used for indicesForFirst and indicesForLast operations
  if (!cursor) {
    const item = await (client as NarrowDatabase)
      .select(fiSelector)
      .from(table)
      .where(and(...groupConditions))
      .limit(1)
      .orderBy(order(column));

    // Return [null, firstItem] or [lastItem, null] depending on direction
    return tuple(null, item[0]?.v ?? null);
  }

  // Case 2: Cursor provided - build condition to find the exact cursor item
  // This combines group conditions with cursor-specific conditions
  const cursorCondition = and(
    ...groupConditions,
    // SECURITY: Always use config for `Object.entries` so that all fields are included
    // This ensures we don't miss any cursor fields that should be matched
    ...Object.entries(cursorConfig).map(
      ([key, column]) => equity(column, cursor[key]) // Use equity to safely handle null/undefined
    )
  );

  // Performance optimization: Use a subquery to get the fractional index of the cursor item
  // This avoids having to fetch the cursor item separately and then do another query
  const subQueryFIOfCursor = (client as NarrowDatabase)
    .select(fiSelector)
    .from(table)
    .where(cursorCondition)
    .limit(1);

  // Find an item adjacent to the cursor item in a single query
  // This is the main query that finds the items we need for generating a new index
  const items = await (client as NarrowDatabase)
    .select(fiSelector)
    .from(table)
    .where(
      and(
        ...groupConditions, // Stay within the same group
        compare(column, subQueryFIOfCursor) // Use gte/lte based on direction
      )
    )
    .limit(2) // We need at most 2 items (the cursor item and one adjacent item)
    .orderBy(order(column)); // Sort in the appropriate direction

  // Process the results
  return items.length < 1
    ? undefined // Cursor item not found in the group
    : tuple(items[0].v, items[1]?.v ?? null); // Reorder based on direction
}

/**
 * Retrieves indices for positioning an item after a specified cursor.
 * This is a wrapper around the `indicesFor` function with `reverse` set to false.
 *
 * @param client - The Drizzle database client
 * @param config - The fractional indexing configuration
 * @param group - The group context for the indices
 * @param cursor - The cursor position, or null for the first position
 * @returns A tuple of indices, or undefined if the cursor doesn't exist
 */
function indicesForAfter(
  client: SupportedDrizzleDatabase,
  config: DrizzleFraciConfig,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null
): Promise<[AFI | null, AFI | null] | undefined> {
  return indicesFor(client, config, group, cursor, false);
}

/**
 * Retrieves indices for positioning an item before a specified cursor.
 * This is a wrapper around the `indicesFor` function with `reverse` set to true.
 *
 * @param client - The Drizzle database client
 * @param config - The fractional indexing configuration
 * @param group - The group context for the indices
 * @param cursor - The cursor position, or null for the last position
 * @returns A tuple of indices, or undefined if the cursor doesn't exist
 */
function indicesForBefore(
  client: SupportedDrizzleDatabase,
  config: DrizzleFraciConfig,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null
): Promise<[AFI | null, AFI | null] | undefined> {
  return indicesFor(client, config, group, cursor, true);
}

export type FraciForDrizzle<T extends DrizzleFraciConfig> = T["fraci"] & {
  /**
   * Returns the indices to calculate the new index of the item to be inserted after the cursor.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the first item in the group.
   * @returns The indices to calculate the new index of the item to be inserted after the cursor.
   */
  readonly indicesForAfter: {
    (group: DrizzleFraciGroup<T>, cursor: DrizzleFraciCursor<T>): Promise<
      [DrizzleFractionalIndex<T>, DrizzleFractionalIndex<T> | null] | undefined
    >;
    (group: DrizzleFraciGroup<T>, cursor: null): Promise<
      [null, DrizzleFractionalIndex<T> | null]
    >;
  };

  /**
   * Returns the indices to calculate the new index of the item to be inserted before the cursor.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the last item in the group.
   * @returns The indices to calculate the new index of the item to be inserted before the cursor.
   */
  readonly indicesForBefore: {
    (group: DrizzleFraciGroup<T>, cursor: DrizzleFraciCursor<T>): Promise<
      [DrizzleFractionalIndex<T> | null, DrizzleFractionalIndex<T>] | undefined
    >;
    (group: DrizzleFraciGroup<T>, cursor: null): Promise<
      [DrizzleFractionalIndex<T> | null, null]
    >;
  };

  /**
   * Returns the indices to calculate the new index of the first item in the group.
   * Identical to `indicesForAfter(null, group)`.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the first item in the group.
   */
  readonly indicesForFirst: (
    group: DrizzleFraciGroup<T>
  ) => Promise<[null, DrizzleFractionalIndex<T> | null]>;

  /**
   * Returns the indices to calculate the new index of the last item in the group.
   * Identical to `indicesForBefore(null, group)`.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the last item in the group.
   */
  readonly indicesForLast: (
    group: DrizzleFraciGroup<T>
  ) => Promise<[DrizzleFractionalIndex<T> | null, null]>;
};

/**
 * Creates an asynchronous fractional indexing utility for Drizzle ORM.
 * This function enhances a fractional indexing instance with Drizzle-specific
 * methods for retrieving indices based on asynchronous database queries.
 *
 * This is the asynchronous version that works with all supported database engines.
 * For Bun SQLite, use the `drizzleFraciSync` function.
 * The API is identical except that methods return Promises instead of direct values.
 *
 * @template Config - The type of the fractional indexing configuration
 * @param client - The asynchronous Drizzle database client to use for queries
 * @param config - The configuration for fractional indexing
 * @returns An enhanced fractional indexing utility with Drizzle-specific asynchronous methods
 *
 * @example
 * ```typescript
 * const db = drizzle(connection);
 * const todoFraci = drizzleFraciSync(db, defineDrizzleFraci({
 *   fraci({ digitBase: BASE64, lengthBase: BASE64 }),
 *   todos,
 *   todos.position,
 *   { userId: todos.userId },
 *   { id: todos.id }
 * }));
 *
 * // Get indices for inserting at the beginning of a user's todo list
 * // Note: await is needed since this is asynchronous
 * const [a, b] = await todoFraci.indicesForFirst({ userId: 123 });
 * const [newPosition] = todoFraci.generateKeyBetween(a, b);
 * ```
 */
export function drizzleFraci<Config extends DrizzleFraciConfig>(
  client: SupportedDrizzleDatabase,
  config: Config
): FraciForDrizzle<Config> {
  return {
    ...config.fraci,
    indicesForAfter: (
      group: DrizzleFraciGroup<Config>,
      cursor: DrizzleFraciCursor<Config> | null
    ) => indicesForAfter(client, config, group, cursor),
    indicesForBefore: (
      group: DrizzleFraciGroup<Config>,
      cursor: DrizzleFraciCursor<Config> | null
    ) => indicesForBefore(client, config, group, cursor),
    indicesForFirst: (group: DrizzleFraciGroup<Config>) =>
      indicesForAfter(client, config, group, null),
    indicesForLast: (group: DrizzleFraciGroup<Config>) =>
      indicesForBefore(client, config, group, null),
  } as FraciForDrizzle<Config>;
}
