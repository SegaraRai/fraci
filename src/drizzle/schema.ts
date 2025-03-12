import type { Column, Table } from "drizzle-orm";
import type { AnyFraci, FractionalIndexOf } from "../types.js";
import type { DrizzleFraciColumn, DrizzleFraciConfig } from "./types.js";

export function defineDrizzleFraci<
  F extends AnyFraci,
  T extends Table,
  FraciColumn extends DrizzleFraciColumn<FractionalIndexOf<F>>,
  Cursor extends Record<string, Column>,
  Group extends Record<string, Column>
>(
  fraci: F,
  table: T,
  column: FraciColumn,
  cursor: Cursor,
  group: Group
): NoInfer<DrizzleFraciConfig<F, T, FraciColumn, Cursor, Group>> {
  return { fraci, table, column, cursor, group };
}
