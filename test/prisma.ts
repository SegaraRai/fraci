import { PrismaClient } from "@prisma/client";
import { env } from "bun";
import { fileURLToPath } from "node:url";
import { collectMigrations } from "./common.js";

const migrationQueries = await collectMigrations(
  fileURLToPath(new URL("../prisma/migrations", import.meta.url))
);

export async function setupPrisma(): Promise<PrismaClient> {
  // Prisma doesn't support in-memory SQLite databases, so we use a random file name.
  env["PRISMA_DB_URL"] = `file:temp/${crypto.randomUUID()}.db?mode=memory`;

  const prisma = new PrismaClient();
  await prisma.$transaction(async (tx) => {
    for (const query of migrationQueries) {
      await tx.$executeRawUnsafe(query);
    }
  });

  return prisma;
}
