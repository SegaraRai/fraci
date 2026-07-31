import { glob, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function collectMigrations(dir: string): Promise<string[]> {
  const migrationSQLFiles = await Array.fromAsync(
    glob("**/*.sql", { cwd: dir, exclude: ["**/node_modules/**"] }),
  );

  const queries: string[] = [];
  for (const file of migrationSQLFiles) {
    const content = await readFile(resolve(dir, file), "utf-8");
    const withoutComments = content.replace(/--.*$/gm, "");
    const fileQueries =
      withoutComments.match(/(.*?);/gs)?.map((value) => value.trim()) ?? [];
    queries.push(...fileQueries);
  }

  return queries;
}
