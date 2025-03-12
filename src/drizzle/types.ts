import type { Column, ColumnBaseConfig, Table } from "drizzle-orm";
import type { AnyFraci, AnyFractionalIndex, FractionalIndexOf } from "../types";

export type DrizzleFraciColumn<
  FI extends AnyFractionalIndex = AnyFractionalIndex
> = Column<ColumnBaseConfig<"string", string>, object> & {
  _: { data: FI };
};

export type DrizzleFraciConfig<
  F extends AnyFraci = AnyFraci,
  T extends Table = Table,
  FraciColumn extends DrizzleFraciColumn<
    FractionalIndexOf<F>
  > = DrizzleFraciColumn<FractionalIndexOf<F>>,
  Cursor extends Record<string, Column> = Record<string, Column>,
  Group extends Record<string, Column> = Record<string, Column>
> = {
  /** A fraci instance. */
  readonly fraci: F;
  /** The table to which the fractional index belongs. */
  readonly table: T;
  /**
   * The column that stores the fractional index.
   * Must be branded with the fractional index type using `$type<FractionalIndexOf<F>>()`.
   */
  readonly column: FraciColumn;
  readonly cursor: Cursor;
  readonly group: Group;
};

export type DrizzleFraciCursor<T extends DrizzleFraciConfig> = {
  [K in keyof T["cursor"]]: T["cursor"][K]["_"]["data"];
};

export type DrizzleFraciGroup<T extends DrizzleFraciConfig> = {
  [K in keyof T["group"]]: T["group"][K]["_"]["data"];
};

export type DrizzleFractionalIndex<T extends DrizzleFraciConfig> =
  FractionalIndexOf<T["fraci"]>;
