import type { Column, Table } from "drizzle-orm";
import type { AnyFraci, FractionalIndexOf } from "../types.js";
import type { DrizzleFraciColumn, DrizzleFraciConfig } from "./types.js";

export function defineDrizzleFraci<
  F extends AnyFraci,
  T extends Table,
  FraciColumn extends DrizzleFraciColumn<FractionalIndexOf<F>>,
  Cursor extends Record<string, Column>,
  Dependency extends Record<string, Column>
>(
  fraci: F,
  table: T,
  column: FraciColumn,
  cursor: Cursor,
  dependency: Dependency
): NoInfer<DrizzleFraciConfig<F, T, FraciColumn, Cursor, Dependency>> {
  return { fraci, table, column, cursor, dependency };
}
