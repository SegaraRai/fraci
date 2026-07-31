import { PrismaLibSql } from "@prisma/adapter-libsql";
import { webcrypto as crypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../prisma/client/client.js";
import { collectMigrations } from "./common.js";

const migrationQueries = await collectMigrations(
  fileURLToPath(new URL("../prisma/migrations", import.meta.url)),
);

export async function setupPrisma(): Promise<PrismaClient> {
  const prisma = new PrismaClient({
    adapter: new PrismaLibSql({
      url: new URL(`../prisma/temp/${crypto.randomUUID()}.db`, import.meta.url)
        .href,
    }),
  });
  await prisma.$transaction(async (tx) => {
    for (const query of migrationQueries) {
      await tx.$executeRawUnsafe(query);
    }
  });

  return prisma;
}
