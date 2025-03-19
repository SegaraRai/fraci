import { readFile } from "node:fs/promises";

export async function collectMigrations(dir: string): Promise<string[]> {
  const migrationSQLFiles = await Array.fromAsync(
    new Bun.Glob("**/*.sql").scan({ cwd: dir, absolute: true }),
  );

  const queries: string[] = [];
  for (const file of migrationSQLFiles) {
    const content = await readFile(file, "utf-8");
    const withoutComments = content.replace(/--.*$/gm, "");
    const fileQueries =
      withoutComments.match(/(.*?);/gs)?.map((value) => value.trim()) ?? [];
    queries.push(...fileQueries);
  }

  return queries;
}
