import { PrismaLibSql } from "@prisma/adapter-libsql";
import type { FractionalIndexOf } from "fraci";
import { prismaFraci } from "fraci/prisma";
import { test } from "vite-plus/test";
import { verifyOrderingContract } from "../../common/ordering-contract.js";
import { PrismaClient } from "../prisma/client/client.js";

test("prisma minimum-version functionality", async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaLibSql({
      url: `file:./test-${crypto.randomUUID()}.db`,
    }),
  });

  await prisma.$executeRaw`
    CREATE TABLE StringExampleItem (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      fi TEXT NOT NULL,
      groupId INTEGER NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX StringExampleItem_groupId_fi_key
    ON StringExampleItem(groupId, fi)
  `;

  const extended = prisma.$extends(
    prismaFraci(prisma, {
      fields: {
        "stringExampleItem.fi": {
          group: ["groupId"],
          lengthBase: "0123456789",
          digitBase: "0123456789",
        },
      },
    }),
  );

  try {
    const helper = extended.stringExampleItem.fraci("fi");
    await verifyOrderingContract<FractionalIndexOf<typeof helper>>({
      generate: ([a, b]) => helper.generateKeyBetween(a, b).next().value!,
      indicesForFirst: (groupId) => helper.indicesForFirst({ groupId }),
      indicesForLast: (groupId) => helper.indicesForLast({ groupId }),
      indicesForAfter: (groupId, id) =>
        helper.indicesForAfter({ groupId }, { id }),
      indicesForBefore: (groupId, id) =>
        helper.indicesForBefore({ groupId }, { id }),
      insert: (name, groupId, fi) =>
        extended.stringExampleItem.create({
          data: { name, groupId, fi },
        }),
      names: async (groupId) =>
        (
          await extended.stringExampleItem.findMany({
            where: { groupId },
            orderBy: { fi: "asc" },
            select: { name: true },
          })
        ).map(({ name }) => name),
      isConflictError: (error) => helper.isIndexConflictError(error),
    });
  } finally {
    await prisma.$disconnect();
  }
});
