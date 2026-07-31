import { PrismaLibSql } from "@prisma/adapter-libsql";
import { prismaFraci } from "fraci/prisma";
import { expect, test } from "vite-plus/test";
import { PrismaClient } from "../prisma/client/client.js";

test("prisma basic functionality", async () => {
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
    if (!secondPair) {
      throw new Error("Expected indices for the second item");
    }
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
