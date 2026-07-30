import type { AnyFraci } from "../factory.js";
import type { AnyFractionalIndex } from "../lib/types.js";
import type { FractionalIndexOf } from "../types.js";

/**
 * The stable structural portion of a Drizzle column used by fraci.
 *
 * Drizzle's nominal Column class changes between major versions, while the
 * inferred data slot is shared by every supported version.
 */
export type DrizzleColumnLike<Data = unknown> = {
  readonly _: { readonly data: Data };
};

/**
 * The stable structural portion of a Drizzle table used by fraci.
 */
export type DrizzleTableLike = {
  readonly _: unknown;
};

/**
 * Represents a Drizzle ORM column that stores a fractional index.
 * This type extends the standard Drizzle Column type with additional
 * type information to ensure type safety when working with fractional indices.
 *
 * @template FI - The specific fractional index type this column will store
 */
export type DrizzleFraciColumn<
  FI extends AnyFractionalIndex = AnyFractionalIndex,
> = DrizzleColumnLike<FI>;

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
  T extends DrizzleTableLike = DrizzleTableLike,
  FraciColumn extends DrizzleFraciColumn<FractionalIndexOf<F>> =
    DrizzleFraciColumn<FractionalIndexOf<F>>,
  Group extends Record<string, DrizzleColumnLike> = Record<
    string,
    DrizzleColumnLike
  >,
  Cursor extends Record<string, DrizzleColumnLike> = Record<
    string,
    DrizzleColumnLike
  >,
> {
  /** A fraci instance. */
  readonly fraci: F;
  /** The table to which the fractional index belongs. */
  readonly table: T;
  /**
   * The column that stores the fractional index.
   * Must be branded with the fractional index type using `$type<FractionalIndexOf<F>>()`.
   *
   * @see {@link FractionalIndexOf}
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
 * @template Config - The Drizzle fractional indexing configuration
 */
export type DrizzleFraciCursor<Config extends DrizzleFraciConfig> = {
  [K in keyof Config["cursor"]]: Config["cursor"][K]["_"]["data"];
};

/**
 * Represents a group context for fractional indices.
 * This type maps the group columns defined in the configuration to their
 * corresponding data types, creating a type-safe group object.
 *
 * @template Config - The Drizzle fractional indexing configuration
 */
export type DrizzleFraciGroup<Config extends DrizzleFraciConfig> = {
  [K in keyof Config["group"]]: Config["group"][K]["_"]["data"];
};

/**
 * The fractional index type associated with a specific configuration.
 * This type alias extracts the exact fractional index type from the
 * configuration's fraci instance.
 *
 * @template Config - The Drizzle fractional indexing configuration
 */
export type DrizzleFractionalIndex<Config extends DrizzleFraciConfig> =
  FractionalIndexOf<Config["fraci"]>;
