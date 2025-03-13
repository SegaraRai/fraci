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

export type SupportedDrizzleDatabase =
  | BaseSQLiteDatabase<"async", any, any>
  | PgDatabase<any, any, any>
  | MySqlDatabase<any, any, any, any>;

type NarrowDatabase = BaseSQLiteDatabase<"async", any, any> &
  PgDatabase<any, any, any> &
  MySqlDatabase<any, any, any, any>;

async function indicesFor(
  client: SupportedDrizzleDatabase,
  {
    cursor: cursorConfig,
    group: groupConfig,
    column,
    table,
  }: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  group: DrizzleFraciGroup<DrizzleFraciConfig>,
  reverse: boolean
): Promise<[AFI | null, AFI | null] | undefined> {
  const [order, compare, tuple] = OPERATORS[Number(reverse)];
  const fiSelector = { v: sql<AFI>`${column}` };

  // SECURITY: Always use config for `Object.entries` so that all fields are included
  const groupConditions = Object.entries(groupConfig).map(([key, column]) =>
    equity(column, group[key])
  );

  if (!cursor) {
    const item = await (client as NarrowDatabase)
      .select(fiSelector)
      .from(table)
      .where(and(...groupConditions))
      .limit(1)
      .orderBy(order(column));
    return tuple(null, item[0]?.v ?? null);
  }

  const cursorCondition = and(
    ...groupConditions,
    // SECURITY: Always use config for `Object.entries` so that all fields are included
    ...Object.entries(cursorConfig).map(([key, column]) =>
      equity(column, cursor[key])
    )
  );

  const subQueryFIOfCursor = (client as NarrowDatabase)
    .select(fiSelector)
    .from(table)
    .where(cursorCondition)
    .limit(1);

  const items = await (client as NarrowDatabase)
    .select(fiSelector)
    .from(table)
    .where(and(...groupConditions, compare(column, subQueryFIOfCursor)))
    .limit(2)
    .orderBy(order(column));

  return items.length < 1
    ? undefined // Cursor item not found in the group
    : tuple(items[0].v, items[1]?.v ?? null);
}

function indicesForAfter(
  client: SupportedDrizzleDatabase,
  config: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  group: DrizzleFraciGroup<DrizzleFraciConfig>
): Promise<[AFI | null, AFI | null] | undefined> {
  return indicesFor(client, config, cursor, group, false);
}

function indicesForBefore(
  client: SupportedDrizzleDatabase,
  config: DrizzleFraciConfig,
  cursor: DrizzleFraciCursor<DrizzleFraciConfig> | null,
  group: DrizzleFraciGroup<DrizzleFraciConfig>
): Promise<[AFI | null, AFI | null] | undefined> {
  return indicesFor(client, config, cursor, group, true);
}

export type DrizzleFraciFetcher<T extends DrizzleFraciConfig> = T["fraci"] & {
  /**
   * Returns the indices to calculate the new index of the item to be inserted after the cursor.
   *
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the first item in the group.
   * @param group A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the item to be inserted after the cursor.
   */
  readonly indicesForAfter: {
    (cursor: DrizzleFraciCursor<T>, group: DrizzleFraciGroup<T>): Promise<
      [DrizzleFractionalIndex<T>, DrizzleFractionalIndex<T> | null] | undefined
    >;
    (cursor: null, group: DrizzleFraciGroup<T>): Promise<
      [null, DrizzleFractionalIndex<T> | null]
    >;
  };

  /**
   * Returns the indices to calculate the new index of the item to be inserted before the cursor.
   *
   * @param cursor A record of the cursor row columns that uniquely identifies the item within a group. If `null`, this function returns the indices to calculate the new index of the last item in the group.
   * @param group A record of the columns that uniquely identifies the group.
   * @returns The indices to calculate the new index of the item to be inserted before the cursor.
   */
  readonly indicesForBefore: {
    (cursor: DrizzleFraciCursor<T>, group: DrizzleFraciGroup<T>): Promise<
      [DrizzleFractionalIndex<T> | null, DrizzleFractionalIndex<T>] | undefined
    >;
    (cursor: null, group: DrizzleFraciGroup<T>): Promise<
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

export function drizzleFraci<Config extends DrizzleFraciConfig>(
  client: SupportedDrizzleDatabase,
  config: Config
): DrizzleFraciFetcher<Config> {
  return {
    ...config.fraci,
    indicesForAfter: (
      cursor: DrizzleFraciCursor<Config> | null,
      group: DrizzleFraciGroup<Config>
    ) => indicesForAfter(client, config, cursor, group),
    indicesForBefore: (
      cursor: DrizzleFraciCursor<Config> | null,
      group: DrizzleFraciGroup<Config>
    ) => indicesForBefore(client, config, cursor, group),
    indicesForFirst: (group: DrizzleFraciGroup<Config>) =>
      indicesForAfter(client, config, null, group),
    indicesForLast: (group: DrizzleFraciGroup<Config>) =>
      indicesForBefore(client, config, null, group),
  } as DrizzleFraciFetcher<Config>;
}
