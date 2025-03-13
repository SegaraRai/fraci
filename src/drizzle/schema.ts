import type { Column, Table } from "drizzle-orm";
import type { AnyFraci, FractionalIndexOf } from "../types.js";
import type { DrizzleFraciColumn, DrizzleFraciConfig } from "./types.js";

export function defineDrizzleFraci<
  F extends AnyFraci,
  T extends Table,
  FraciColumn extends DrizzleFraciColumn<FractionalIndexOf<F>>,
  Group extends Record<string, Column>,
  Cursor extends Record<string, Column>
>(
  fraci: F,
  table: T,
  column: FraciColumn,
  group: Group,
  cursor: Cursor
): NoInfer<DrizzleFraciConfig<F, T, FraciColumn, Group, Cursor>> {
  return { fraci, table, column, group, cursor };
}
