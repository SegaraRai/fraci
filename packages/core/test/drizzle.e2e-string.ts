import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { fileURLToPath } from "node:url";
import * as schema from "../drizzle/schema.e2e-string.js";
import { collectMigrations } from "./common.js";

const migrationQueries = await collectMigrations(
  fileURLToPath(new URL("../drizzle/migrations.e2e-string", import.meta.url)),
);

function asSingleTuple<T>(arr: T[]): [T] {
  return arr as [T];
}

export function setupDrizzleDBBunSQLite() {
  const db = drizzle({
    connection: ":memory:",
    schema,
  });

  db.transaction((tx): void => {
    for (const query of migrationQueries) {
      tx.run(sql.raw(query));
    }
  });

  return db;
}

export async function setupDrizzleDBLibSQL() {
  const db = drizzleLibSQL({
    connection: ":memory:",
    schema,
  });

  await db.batch(
    asSingleTuple(migrationQueries.map((query) => db.run(sql.raw(query)))),
  );

  return db;
}
