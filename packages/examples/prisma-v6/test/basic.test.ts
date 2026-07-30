import { expect, test } from "bun:test";
import { prismaFraci } from "fraci/prisma";
import { PrismaClient } from "../prisma/client/index.js";
import { createTempDbName } from "../test-utils.js";

test("prisma basic functionality", async () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:./${createTempDbName()}` } },
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
    const firstPair = await helper.indicesForFirst({ groupId: 1 });
    const [fi1] = helper.generateKeyBetween(...firstPair);
    const first = await extended.stringExampleItem.create({
      data: { name: "First Item", groupId: 1, fi: fi1 },
    });
    const secondPair = await helper.indicesForAfter(
      { groupId: 1 },
      { id: first.id },
    );
    expect(secondPair).toBeDefined();
    if (!secondPair) throw new Error("Expected adjacent indices");
    const [fi2] = helper.generateKeyBetween(...secondPair);
    await extended.stringExampleItem.create({
      data: { name: "Second Item", groupId: 1, fi: fi2 },
    });

    const items = await extended.stringExampleItem.findMany({
      where: { groupId: 1 },
      orderBy: { fi: "asc" },
    });
    expect(items.map(({ name }) => name)).toEqual([
      "First Item",
      "Second Item",
    ]);
  } finally {
    await prisma.$disconnect();
  }
});
