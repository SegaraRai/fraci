// Note that this test needs the package to be built before running and type checking.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { createFractionalIndexingExtension } from "fraci/prisma";
import { BASE26, BASE36, BASE95 } from "./bases";

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends(
  createFractionalIndexingExtension({
    prefix: "__fi_prefix_" as const,
    fields: {
      "article.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "tagsOnPhotos.tagFI": {
        digitBase: BASE95,
        lengthBase: BASE95,
      },
      "tagsOnPhotos.photoFI": {
        digitBase: BASE95,
        lengthBase: BASE95,
      },
    } as const,
  })
);

const prismaS = basePrisma.$extends(
  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        group: ["userId"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        // `userId` is not necessary in practice; it's just for demonstration.
        group: ["articleId", "userId"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "tagsOnPhotos.tagFI": {
        group: ["photoId"],
        digitBase: BASE95,
        lengthBase: BASE95,
      },
      "tagsOnPhotos.photoFI": {
        group: ["tagId"],
        digitBase: BASE95,
        lengthBase: BASE95,
      },
    } as const,
    sign: {
      secret: "EXAMPLE_SECRET",
      encoding: "base64url",
    },
  })
);

// Data seeding

const clearAll = async () => {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`PRAGMA foreign_keys = OFF`;
    await tx.$queryRaw`DELETE FROM tagsOnPhotos`;
    await tx.$queryRaw`DELETE FROM photo`;
    await tx.$queryRaw`DELETE FROM article`;
    await tx.$queryRaw`DELETE FROM tag`;
    await tx.$queryRaw`DELETE FROM user`;
    await tx.$queryRaw`PRAGMA foreign_keys = ON;`;
  });
};

afterAll(async () => {
  await clearAll();

  await prisma.$queryRaw`VACUUM`;
});

beforeAll(async () => {
  await clearAll();

  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({
      data: [
        { id: 1, name: "user1", email: "" },
        { id: 2, name: "user2", email: "" },
        { id: 3, name: "user3", email: "" },
        { id: 4, name: "user4", email: "" },
        { id: 5, name: "user5", email: "" },
      ],
    });

    await tx.tag.createMany({
      data: [
        { id: 1, name: "tag1" },
        { id: 2, name: "tag2" },
        { id: 3, name: "tag3" },
        { id: 4, name: "tag4" },
        { id: 5, name: "tag5" },
      ],
    });

    {
      const [fi] = prisma.article
        .fractionalIndexing("fi")
        .generateNKeysBetween(null, null, 3);
      await tx.article.createMany({
        data: [
          {
            id: 1,
            title: "article1 (user1)",
            content: "",
            fi: fi[0],
            userId: 1,
          },
          {
            id: 2,
            title: "article2 (user1)",
            content: "",
            fi: fi[1],
            userId: 1,
          },
          {
            id: 3,
            title: "article3 (user2)",
            content: "",
            fi: fi[0],
            userId: 2,
          },
          {
            id: 4,
            title: "article4 (user2)",
            content: "",
            fi: fi[1],
            userId: 2,
          },
          {
            id: 5,
            title: "article5 (user2)",
            content: "",
            fi: fi[2],
            userId: 2,
          },
        ],
      });
    }

    {
      const [fi] = prisma.photo
        .fractionalIndexing("fi")
        .generateNKeysBetween(null, null, 3);
      await tx.photo.createMany({
        data: [
          {
            id: 1,
            title: "photo1 (article1)",
            altText: "",
            fi: fi[0],
            articleId: 1,
            userId: 1,
          },
          {
            id: 2,
            title: "photo2 (article1)",
            altText: "",
            fi: fi[1],
            articleId: 1,
            userId: 1,
          },
          {
            id: 3,
            title: "photo3 (article2)",
            altText: "",
            fi: fi[0],
            articleId: 2,
            userId: 1,
          },
          {
            id: 4,
            title: "photo4 (article3)",
            altText: "",
            fi: fi[0],
            articleId: 3,
            userId: 2,
          },
          {
            id: 5,
            title: "photo5 (article3)",
            altText: "alt5",
            fi: fi[1],
            articleId: 3,
            userId: 2,
          },
        ],
      });
    }

    {
      const [pfi] = prisma.tagsOnPhotos
        .fractionalIndexing("photoFI")
        .generateNKeysBetween(null, null, 1);
      const [tfi] = prisma.tagsOnPhotos
        .fractionalIndexing("tagFI")
        .generateNKeysBetween(null, null, 2);

      await tx.tagsOnPhotos.createMany({
        data: [
          {
            id: 1,
            photoId: 1,
            tagId: 1,
            tagFI: tfi[0],
            photoFI: pfi[0],
          },
          {
            id: 2,
            photoId: 1,
            tagId: 2,
            tagFI: tfi[1],
            photoFI: pfi[0],
          },
        ],
      });
    }
  });
});

test("instantiation type check", () => {
  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
  });

  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        group: ["userId"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        group: ["articleId", "userId"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: () => "",
    verify: () => true,
  });

  createFractionalIndexingExtension({
    // @ts-expect-error `group` is not allowed if `sign` is not provided.
    fields: {
      "article.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
  });

  // @ts-expect-error `group` is required if `sign` is provided.
  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  createFractionalIndexingExtension({
    // @ts-expect-error `group` is required if `sign` is provided.
    fields: {
      "article.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error Only existing fields can be specified.
        group: ["altText"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error Only serializable fields can be specified.
        group: ["createdAt"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error The fractional index field itself cannot be specified.
        group: ["fi"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        group: [],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    sign: { secret: "" },
  });

  // @ts-expect-error `verify` is not allowed if `sign` is not set.
  createFractionalIndexingExtension({
    fields: {
      "article.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
      "photo.fi": {
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
    verify: () => true,
  });

  expect(true).toBe(true);
});

describe("without signing", () => {
  test("photo.fi", async () => {
    const photo = await prisma.photo.findUniqueOrThrow({ where: { id: 1 } });
    expect(photo.__fi_prefix_fi as string).toBe(photo.fi);

    expect(prisma.photo.fractionalIndexing("fi")).toBeObject();
  });

  test("should not exist in photo.title", async () => {
    const photo = await prisma.photo.findUniqueOrThrow({ where: { id: 1 } });

    // @ts-expect-error
    expect(photo.__fi_prefix_title).toBeUndefined();

    // @ts-expect-error
    expect(prisma.photo.fractionalIndexing("title")).toBeUndefined();
  });

  test("should not exist in tag.name", async () => {
    const tag = await prisma.tag.findUniqueOrThrow({ where: { id: 1 } });

    // @ts-expect-error
    expect(tag.__fi_prefix_name).toBeUndefined();

    // @ts-expect-error
    expect(prisma.tag.fractionalIndexing("name")).toBeUndefined();
  });

  test("tagsOnPhotos", async () => {
    const item = await prisma.tagsOnPhotos.findUniqueOrThrow({
      where: { id: 1 },
    });

    expect(item.__fi_prefix_tagFI as string).toBe(item.tagFI);

    expect(item.__fi_prefix_photoFI as string).toBe(item.photoFI);

    // @ts-expect-error
    item.__fi_prefix_tagFI === item.__fi_prefix_photoFI;
  });
});

describe("with signing", () => {
  test("photo.fi", async () => {
    const photo = await prismaS.photo.findUniqueOrThrow({ where: { id: 1 } });
    expect(photo.__fi_fi as string).toBe(photo.fi);

    expect(prismaS.photo.fractionalIndexing("fi")).toBeObject();

    expect(prismaS.photo.fractionalIndexing("fi")).toBeObject();
  });

  test("should not exist in photo.title", async () => {
    const photo = await prismaS.photo.findUniqueOrThrow({ where: { id: 1 } });

    // @ts-expect-error
    expect(photo.__fi_title).toBeUndefined();

    // @ts-expect-error
    expect(prismaS.photo.fractionalIndexing("title")).toBeUndefined();
  });

  test("should not exist in tag.name", async () => {
    const tag = await prisma.tag.findUniqueOrThrow({ where: { id: 1 } });

    // @ts-expect-error
    expect(tag.__fi_name).toBeUndefined();

    // @ts-expect-error
    expect(prismaS.tag.fractionalIndexing("name")).toBeUndefined();
  });

  test("tagsOnPhotos", async () => {
    const item = await prismaS.tagsOnPhotos.findUniqueOrThrow({
      where: { id: 1 },
    });

    expect(item.__fi_tagFI as string).toBe(item.tagFI);

    expect(item.__fi_photoFI as string).toBe(item.photoFI);

    // @ts-expect-error
    item.__fi_tagFI === item.__fi_photoFI;
  });

  test("signing", async () => {
    const item = await prismaS.tagsOnPhotos.findUniqueOrThrow({
      where: { id: 1 },
    });

    expect(
      prismaS.tagsOnPhotos
        .fractionalIndexing("tagFI")
        .parse(item.tagFI, item.__fi_tagFI_sign, {
          photoId: item.photoId,
        })
    ).toBe(item.__fi_tagFI);

    // signature is incorrect
    expect(
      prismaS.tagsOnPhotos
        .fractionalIndexing("tagFI")
        .parse(item.tagFI, item.__fi_photoFI_sign, {
          photoId: item.photoId,
        })
    ).toBeUndefined();

    // photoId is incorrect
    expect(
      prismaS.tagsOnPhotos
        .fractionalIndexing("tagFI")
        .parse(item.tagFI, item.__fi_tagFI_sign, {
          photoId: item.photoId + 1,
        })
    ).toBeUndefined();
  });
});
