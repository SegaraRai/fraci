import { and, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { AnyFractionalIndex as AFI } from "../types.js";
import { equity, OPERATORS } from "./common.js";
import type {
  DrizzleFraciConfig,
  DrizzleFraciCursor,
  DrizzleFraciDependency,
  DrizzleFractionalIndex,
} from "./types.js";

export type SupportedDrizzleDatabaseSync = BaseSQLiteDatabase<"sync", any, any>;

function indicesFor(
  client: SupportedDrizzleDatabaseSync,
  {
    cursor: cursorConfig,
    dependency: dependencyConfig,
    column,
    table,
  }: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  dependency: DrizzleFraciDependency<DrizzleFraciConfig>,
  reverse: boolean
): [AFI | null, AFI | null] | undefined {
  const [order, compare, tuple] = OPERATORS[Number(reverse)];
  const fiSelector = { v: sql<AFI>`${column}` };;

  // SECURITY: Always use config for `Object.entries` so that all fields are included
  const conditions = Object.entries(dependencyConfig).map(([key, column]) =>
    equity(column, dependency[key])
  );

  if (!cursor) {
    const item = client
      .select(fiSelector)
      .from(table)
      .where(and(...conditions))
      .limit(1)
      .orderBy(order(column))
      .all();
    return tuple(null, item[0]?.v ?? null);
  }

  const cursorCondition = and(
    ...conditions,
    // SECURITY: Always use config for `Object.entries` so that all fields are included
    ...Object.entries(cursorConfig).map(([key, column]) =>
      equity(column, cursor[key])
    )
  );

  const subQueryFIOfCursor = client
    .select(fiSelector)
    .from(table)
    .where(cursorCondition)
    .limit(1);

  const items = client
    .select(fiSelector)
    .from(table)
    .where(and(...conditions, compare(column, subQueryFIOfCursor)))
    .limit(2)
    .orderBy(order(column))
    .all();

  return items.length < 1
    ? undefined // Cursor item not found in the group
    : tuple(items[0].v, items[1]?.v ?? null);
}

function indicesForAfter(
  client: SupportedDrizzleDatabaseSync,
  config: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  dependency: DrizzleFraciDependency<DrizzleFraciConfig>
): [string | null, string | null] | undefined {
  return indicesFor(client, config, cursor, dependency, false);
}

function indicesForBefore(
  client: SupportedDrizzleDatabaseSync,
  config: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  dependency: DrizzleFraciDependency<DrizzleFraciConfig>
): [AFI | null, AFI | null] | undefined {
  return indicesFor(client, config, cursor, dependency, true);
}

export type DrizzleFraciFetcherSync<T extends DrizzleFraciConfig> = {
  /**
   * Returns the indices to calculate the new index of the item to be inserted after the cursor.
   *
   * @param cursor A record of the cursor row columns that uniquely identifies the item with `dependency`. If `null`, this function returns the indices to calculate the new index of the first item in the group.
   * @param dependency A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the item to be inserted after the cursor.
   */
  readonly indicesForAfter: {
    (cursor: DrizzleFraciCursor<T>, dependency: DrizzleFraciDependency<T>):
      | [DrizzleFractionalIndex<T>, DrizzleFractionalIndex<T> | null]
      | undefined;
    (cursor: null, dependency: DrizzleFraciDependency<T>): [
      null,
      DrizzleFractionalIndex<T> | null
    ];
  };

  /**
   * Returns the indices to calculate the new index of the item to be inserted before the cursor.
   *
   * @param cursor A record of the cursor row columns that uniquely identifies the item with `dependency`. If `null`, this function returns the indices to calculate the new index of the last item in the group.
   * @param dependency A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the item to be inserted before the cursor.
   */
  readonly indicesForBefore: {
    (cursor: DrizzleFraciCursor<T>, dependency: DrizzleFraciDependency<T>):
      | [DrizzleFractionalIndex<T> | null, DrizzleFractionalIndex<T>]
      | undefined;
    (cursor: null, dependency: DrizzleFraciDependency<T>): [
      DrizzleFractionalIndex<T> | null,
      null
    ];
  };

  /**
   * Returns the indices to calculate the new index of the first item in the group.
   * Identical to `indicesForAfter(null, dependency)`.
   *
   * @param dependency A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the first item in the group.
   */
  readonly indicesForFirst: (
    dependency: DrizzleFraciDependency<T>
  ) => [null, DrizzleFractionalIndex<T> | null];

  /**
   * Returns the indices to calculate the new index of the last item in the group.
   * Identical to `indicesForBefore(null, dependency)`.
   *
   * @param dependency A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the last item in the group.
   */
  readonly indicesForLast: (
    dependency: DrizzleFraciDependency<T>
  ) => [DrizzleFractionalIndex<T> | null, null];
};

export function drizzleFraciSync<Config extends DrizzleFraciConfig>(
  client: SupportedDrizzleDatabaseSync,
  config: Config
): DrizzleFraciFetcherSync<Config> {
  return {
    indicesForAfter: (
      cursor: DrizzleFraciCursor<Config> | null,
      dependency: DrizzleFraciDependency<Config>
    ) => indicesForAfter(client, config, cursor, dependency),
    indicesForBefore: (
      cursor: DrizzleFraciCursor<Config> | null,
      dependency: DrizzleFraciDependency<Config>
    ) => indicesForBefore(client, config, cursor, dependency),
    indicesForFirst: (dependency: DrizzleFraciDependency<Config>) =>
      indicesForAfter(client, config, null, dependency),
    indicesForLast: (dependency: DrizzleFraciDependency<Config>) =>
      indicesForBefore(client, config, null, dependency),
  } as DrizzleFraciFetcherSync<Config>;
}
