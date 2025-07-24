import { expect, test } from "bun:test";
import { prismaFraci } from "fraci/prisma";
import { PrismaClient } from "../prisma/client/index.js";
import { createTempDbName } from "../test-utils.js";

test("prisma basic functionality", async () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:./${createTempDbName()}`,
      },
    },
  });

  // Create the table
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
    CREATE UNIQUE INDEX StringExampleItem_groupId_fi_key ON StringExampleItem(groupId, fi)
  `;

  const extendedPrisma = prisma.$extends(
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
    const xfi = extendedPrisma.stringExampleItem.fraci("fi");

    // Test basic insertion and ordering
    const indices1 = await xfi.indicesForFirst({ groupId: 1 });
    const [fi1] = xfi.generateKeyBetween(...indices1);

    const item1 = await extendedPrisma.stringExampleItem.create({
      data: {
        name: "First Item",
        groupId: 1,
        fi: fi1,
      },
    });

    const indices2 = await xfi.indicesForAfter(
      { groupId: 1 },
      { id: item1.id },
    );
    const [fi2] = xfi.generateKeyBetween(...indices2);

    const item2 = await extendedPrisma.stringExampleItem.create({
      data: {
        name: "Second Item",
        groupId: 1,
        fi: fi2,
      },
    });

    expect(item1.fi).toBeDefined();
    expect(item2.fi).toBeDefined();
    expect(item1.fi < item2.fi).toBe(true);

    const items = await extendedPrisma.stringExampleItem.findMany({
      where: { groupId: 1 },
      orderBy: { fi: "asc" },
    });

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("First Item");
    expect(items[1].name).toBe("Second Item");
  } finally {
    await prisma.$disconnect();
  }
});
