import type { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import { collectMigrations } from "./common.js";

const migrationQueries = await collectMigrations(
  fileURLToPath(new URL("../prisma/migrations", import.meta.url))
);

export async function runPrismaMigrations(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const query of migrationQueries) {
      await tx.$executeRawUnsafe(query);
    }
  });
}
