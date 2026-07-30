import { definePrismaFraci, prismaFraci } from "fraci/prisma";

// Generic server utilities that work with all Prisma versions
export class PrismaTestServer {
  private prisma: any;
  private extendedPrisma: any;

  constructor(PrismaClientClass: any, dbUrl: string) {
    this.prisma = new PrismaClientClass({
      datasources: {
        db: { url: dbUrl },
      },
    });

    const fraci = definePrismaFraci({
      StringExampleItem: {
        fi: "string",
      },
      BinaryExampleItem: {
        fi: "binary",
      },
    });

    const extension = prismaFraci(fraci);
    this.extendedPrisma = this.prisma.$extends(extension);
  }

  getPrisma() {
    return this.prisma;
  }

  getExtendedPrisma() {
    return this.extendedPrisma;
  }

  async close() {
    await this.prisma.$disconnect();
  }
}

// Common test operations
export async function insertStringItems(
  extendedPrisma: any,
  groupId: number,
  count: number = 2,
) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = await extendedPrisma.stringExampleItem.create({
      data: {
        name: `Test Item ${i + 1}`,
        groupId,
      },
    });
    items.push(item);
  }
  return items;
}

export async function getOrderedStringItems(
  extendedPrisma: any,
  groupId: number,
) {
  return await extendedPrisma.stringExampleItem.findMany({
    where: { groupId },
    orderBy: { fi: "asc" },
  });
}

export async function insertBinaryItems(
  extendedPrisma: any,
  groupId: number,
  count: number = 2,
) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = await extendedPrisma.binaryExampleItem.create({
      data: {
        name: `Binary Test Item ${i + 1}`,
        groupId,
      },
    });
    items.push(item);
  }
  return items;
}
