import type { Column, ColumnBaseConfig, Table } from "drizzle-orm";
import type { AnyFraci } from "../factory.js";
import type {
  AnyBinaryFractionalIndex,
  AnyFractionalIndex,
} from "../lib/types.js";
import type { FractionalIndexOf } from "../types.js";

/**
 * Represents a Drizzle ORM column that stores a fractional index.
 * This type extends the standard Drizzle Column type with additional
 * type information to ensure type safety when working with fractional indices.
 *
 * @template FI - The specific fractional index type this column will store
 */
export type DrizzleFraciColumn<
  FI extends AnyFractionalIndex = AnyFractionalIndex
> = Column<
  ColumnBaseConfig<
    FI extends AnyBinaryFractionalIndex ? "buffer" : "string",
    string
  >,
  object
> & {
  _: { data: FI };
};

/**
 * Configuration for using fractional indexing with Drizzle ORM.
 * This type defines the structure needed to integrate fractional indexing
 * into a Drizzle ORM database schema, including the table, column, and
 * grouping information.
 *
 * @template F - The fractional indexing utility type
 * @template T - The Drizzle table type
 * @template FraciColumn - The column type that stores fractional indices
 * @template Group - The record type for grouping columns
 * @template Cursor - The record type for cursor columns
 */
export interface DrizzleFraciConfig<
  F extends AnyFraci = AnyFraci,
  T extends Table = Table,
  FraciColumn extends DrizzleFraciColumn<
    FractionalIndexOf<F>
  > = DrizzleFraciColumn<FractionalIndexOf<F>>,
  Group extends Record<string, Column> = Record<string, Column>,
  Cursor extends Record<string, Column> = Record<string, Column>
> {
  /** A fraci instance. */
  readonly fraci: F;
  /** The table to which the fractional index belongs. */
  readonly table: T;
  /**
   * The column that stores the fractional index.
   * Must be branded with the fractional index type using `$type<FractionalIndexOf<F>>()`.
   */
  readonly column: FraciColumn;
  /** The columns that define the grouping context for the fractional index. */
  readonly group: Group;
  /** The columns that uniquely identify a row within a group. */
  readonly cursor: Cursor;
}

/**
 * Represents a cursor for navigating through fractionally indexed rows.
 * This type maps the cursor columns defined in the configuration to their
 * corresponding data types, creating a type-safe cursor object.
 *
 * @template T - The Drizzle fractional indexing configuration
 */
export type DrizzleFraciCursor<T extends DrizzleFraciConfig> = {
  [K in keyof T["cursor"]]: T["cursor"][K]["_"]["data"];
};

/**
 * Represents a group context for fractional indices.
 * This type maps the group columns defined in the configuration to their
 * corresponding data types, creating a type-safe group object.
 *
 * @template T - The Drizzle fractional indexing configuration
 */
export type DrizzleFraciGroup<T extends DrizzleFraciConfig> = {
  [K in keyof T["group"]]: T["group"][K]["_"]["data"];
};

/**
 * The fractional index type associated with a specific configuration.
 * This type alias extracts the exact fractional index type from the
 * configuration's fraci instance.
 *
 * @template T - The Drizzle fractional indexing configuration
 */
export type DrizzleFractionalIndex<T extends DrizzleFraciConfig> =
  FractionalIndexOf<T["fraci"]>;
