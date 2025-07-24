import type { Column, Table } from "drizzle-orm";
import type { AnyFraci } from "../factory.js";
import type { FractionalIndexOf } from "../types.js";
import type { DrizzleFraciColumn, DrizzleFraciConfig } from "./types.js";

/**
 * Creates a configuration object for fractional indexing with Drizzle ORM.
 * This function defines how fractional indices are integrated into a Drizzle schema,
 * specifying the table, column, grouping context, and cursor information.
 *
 * @template F - The fractional indexing utility type
 * @template T - The Drizzle table type
 * @template FraciColumn - The column type that stores fractional indices
 * @template Group - The record type for grouping columns
 * @template Cursor - The record type for cursor columns
 *
 * @param fraci - The fractional indexing utility instance
 * @param table - The Drizzle table object
 * @param column - The column that will store the fractional index
 * @param group - The columns that define the grouping context
 * @param cursor - The columns that uniquely identify a row within a group
 * @returns A configuration object for fractional indexing
 */
export function defineDrizzleFraci<
  F extends AnyFraci,
  T extends Table,
  FraciColumn extends DrizzleFraciColumn<FractionalIndexOf<F>>,
  Group extends Record<string, Column>,
  Cursor extends Record<string, Column>,
>(
  fraci: F,
  table: T,
  column: FraciColumn,
  group: Group,
  cursor: Cursor,
): DrizzleFraciConfig<F, T, FraciColumn, Group, Cursor> {
  return { fraci, table, column, group, cursor };
}
