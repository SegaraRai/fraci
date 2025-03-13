import { and, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { AnyFractionalIndex as AFI } from "../types.js";
import { equity, OPERATORS } from "./common.js";
import type {
  DrizzleFraciConfig,
  DrizzleFraciCursor,
  DrizzleFraciGroup,
  DrizzleFractionalIndex,
} from "./types.js";

export type SupportedDrizzleDatabaseSync = BaseSQLiteDatabase<"sync", any, any>;

function indicesFor(
  client: SupportedDrizzleDatabaseSync,
  {
    group: groupConfig,
    cursor: cursorConfig,
    column,
    table,
  }: DrizzleFraciConfig,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  reverse: boolean
): [AFI | null, AFI | null] | undefined {
  const [order, compare, tuple] = OPERATORS[Number(reverse)];
  const fiSelector = { v: sql<AFI>`${column}` };

  // SECURITY: Always use config for `Object.entries` so that all fields are included
  const conditions = Object.entries(groupConfig).map(([key, column]) =>
    equity(column, group[key])
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
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null
): [AFI | null, AFI | null] | undefined {
  return indicesFor(client, config, group, cursor, false);
}

function indicesForBefore(
  client: SupportedDrizzleDatabaseSync,
  config: DrizzleFraciConfig,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null
): [AFI | null, AFI | null] | undefined {
  return indicesFor(client, config, group, cursor, true);
}

export type FraciForDrizzleSync<T extends DrizzleFraciConfig> = T["fraci"] & {
  /**
   * Returns the indices to calculate the new index of the item to be inserted after the cursor.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the first item in the group.
   * @returns The indices to calculate the new index of the item to be inserted after the cursor.
   */
  readonly indicesForAfter: {
    (group: DrizzleFraciGroup<T>, cursor: DrizzleFraciCursor<T>):
      | [DrizzleFractionalIndex<T>, DrizzleFractionalIndex<T> | null]
      | undefined;
    (group: DrizzleFraciGroup<T>, cursor: null): [
      null,
      DrizzleFractionalIndex<T> | null
    ];
  };

  /**
   * Returns the indices to calculate the new index of the item to be inserted before the cursor.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the last item in the group.
   * @returns The indices to calculate the new index of the item to be inserted before the cursor.
   */
  readonly indicesForBefore: {
    (group: DrizzleFraciGroup<T>, cursor: DrizzleFraciCursor<T>):
      | [DrizzleFractionalIndex<T> | null, DrizzleFractionalIndex<T>]
      | undefined;
    (group: DrizzleFraciGroup<T>, cursor: null): [
      DrizzleFractionalIndex<T> | null,
      null
    ];
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
  ) => [null, DrizzleFractionalIndex<T> | null];

  /**
   * Returns the indices to calculate the new index of the last item in the group.
   * Identical to `indicesForBefore(null, group)`.
   *
   * @param group A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the last item in the group.
   */
  readonly indicesForLast: (
    group: DrizzleFraciGroup<T>
  ) => [DrizzleFractionalIndex<T> | null, null];
};

export function drizzleFraciSync<Config extends DrizzleFraciConfig>(
  client: SupportedDrizzleDatabaseSync,
  config: Config
): FraciForDrizzleSync<Config> {
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
  } as FraciForDrizzleSync<Config>;
}
