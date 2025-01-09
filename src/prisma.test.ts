// Note that this test needs the package to be built before running and type checking.
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { fraciExtension } from "fraci/prisma";
import { BASE26, BASE36, BASE95 } from "./bases";

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends(
  fraciExtension({
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
    await tx.$queryRaw`DELETE FROM sqlite_sequence WHERE name != 'exampleItem'`;
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
        .fraci("fi")
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
      const [fi] = prisma.photo.fraci("fi").generateNKeysBetween(null, null, 3);
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
        .fraci("photoFI")
        .generateNKeysBetween(null, null, 1);
      const [tfi] = prisma.tagsOnPhotos
        .fraci("tagFI")
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
  fraciExtension({
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
  });

  expect(() =>
    basePrisma.$extends(
      fraciExtension({
        fields: {
          // @ts-expect-error Only existing fields can be specified.
          "notExist.fi": {
            group: [],
            digitBase: BASE36,
            lengthBase: BASE26,
          },
        } as const,
      })
    )
  ).toThrowError("Could not get field information for notExist.fi");

  expect(() =>
    basePrisma.$extends(
      fraciExtension({
        fields: {
          // @ts-expect-error Only existing fields can be specified.
          "article.notExist": {
            group: [],
            digitBase: BASE36,
            lengthBase: BASE26,
          },
        } as const,
      })
    )
  ).toThrowError("Could not get field information for article.notExist");

  fraciExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error Only existing fields can be specified.
        group: ["altText"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
  });

  fraciExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error Only serializable fields can be specified.
        group: ["createdAt"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
  });

  fraciExtension({
    fields: {
      "article.fi": {
        // @ts-expect-error The fractional index field itself cannot be specified.
        group: ["fi"],
        digitBase: BASE36,
        lengthBase: BASE26,
      },
    } as const,
  });

  expect(true).toBe(true);
});

describe("basic", () => {
  test("photo.fi", async () => {
    expect(prisma.photo.fraci("fi")).toBeObject();
  });

  test("should not exist in photo.title", async () => {
    // @ts-expect-error
    expect(prisma.photo.fraci("title")).toBeUndefined();
  });

  test("should not exist in tag.name", async () => {
    // @ts-expect-error
    expect(prisma.tag.fraci("name")).toBeUndefined();
  });
});

describe("indicesForBefore and indicesForAfter", () => {
  test("article (2 items in a group)", async () => {
    const articles = await prisma.article.findMany({
      where: { userId: 1 },
      orderBy: { fi: "asc" },
    });

    expect(articles).toBeArrayOfSize(2);
    expect(articles[0].title).toBe("article1 (user1)");
    expect(articles[1].title).toBe("article2 (user1)");

    const indicesForLast1 = await prisma.article
      .fraci("fi")
      .indicesForBefore(null, { userId: 1 });
    expect(indicesForLast1).toBeArrayOfSize(2);
    expect(indicesForLast1[0] as string).toBe(articles[1].fi);
    expect(indicesForLast1[1]).toBeNull();

    const indicesForLast2 = await prisma.article
      .fraci("fi")
      .indicesForAfter({ id: articles[1].id }, { userId: 1 });
    expect(indicesForLast2).toEqual(indicesForLast1);

    const indicesForFirst1 = await prisma.article
      .fraci("fi")
      .indicesForAfter(null, { userId: 1 });
    expect(indicesForFirst1).toBeArrayOfSize(2);
    expect(indicesForFirst1[0]).toBeNull();
    expect(indicesForFirst1[1] as string).toBe(articles[0].fi);

    const indicesForFirst2 = await prisma.article
      .fraci("fi")
      .indicesForBefore({ id: articles[0].id }, { userId: 1 });
    expect(indicesForFirst2).toEqual(indicesForFirst1);

    const indicesForMiddle1 = await prisma.article
      .fraci("fi")
      .indicesForBefore({ id: articles[1].id }, { userId: 1 });
    expect(indicesForMiddle1).toBeArrayOfSize(2);
    expect(indicesForMiddle1?.[0] as string).toBe(articles[0].fi);
    expect(indicesForMiddle1?.[1] as string).toBe(articles[1].fi);

    const indicesForMiddle2 = await prisma.article
      .fraci("fi")
      .indicesForAfter({ id: articles[0].id }, { userId: 1 });
    expect(indicesForMiddle2).toEqual(indicesForMiddle1!);
  });

  test("photo (1 item in a group)", async () => {
    const photos = await prisma.photo.findMany({
      where: { articleId: 2, userId: 1 },
      orderBy: { fi: "asc" },
    });

    expect(photos).toBeArrayOfSize(1);
    expect(photos[0].title).toBe("photo3 (article2)");

    const indicesForLast1 = await prisma.photo
      .fraci("fi")
      .indicesForBefore(null, { articleId: 2, userId: 1 });
    expect(indicesForLast1).toBeArrayOfSize(2);
    expect(indicesForLast1[0] as string).toBe(photos[0].fi);
    expect(indicesForLast1[1]).toBeNull();

    const indicesForLast2 = await prisma.photo
      .fraci("fi")
      .indicesForAfter({ id: photos[0].id }, { articleId: 2, userId: 1 });
    expect(indicesForLast2).toEqual(indicesForLast1);

    const indicesForFirst1 = await prisma.photo
      .fraci("fi")
      .indicesForAfter(null, { articleId: 2, userId: 1 });
    expect(indicesForFirst1).toBeArrayOfSize(2);
    expect(indicesForFirst1[0]).toBeNull();
    expect(indicesForFirst1[1] as string).toBe(photos[0].fi);

    const indicesForFirst2 = await prisma.photo
      .fraci("fi")
      .indicesForBefore({ id: photos[0].id }, { articleId: 2, userId: 1 });
    expect(indicesForFirst2).toEqual(indicesForFirst1);
  });

  test("photo (no items in a group)", async () => {
    const photos = await prisma.photo.findMany({
      where: { articleId: 999, userId: 1 },
      orderBy: { fi: "asc" },
    });

    expect(photos).toBeArrayOfSize(0);

    const indicesForLast = await prisma.photo
      .fraci("fi")
      .indicesForBefore(null, { articleId: 999, userId: 1 });
    expect(indicesForLast).toBeArrayOfSize(2);
    expect(indicesForLast[0]).toBeNull();
    expect(indicesForLast[1]).toBeNull();

    const indicesForFirst = await prisma.photo
      .fraci("fi")
      .indicesForAfter(null, { articleId: 999, userId: 1 });
    expect(indicesForFirst).toBeArrayOfSize(2);
    expect(indicesForFirst[0]).toBeNull();
    expect(indicesForFirst[1]).toBeNull();
  });

  test("inconsistent group", async () => {
    const articlesByUser1 = await prisma.article.findMany({
      where: { userId: 1 },
      orderBy: { fi: "asc" },
    });
    const articlesByUser2 = await prisma.article.findMany({
      where: { userId: 2 },
      orderBy: { fi: "asc" },
    });

    const indices1 = await prisma.article
      .fraci("fi")
      .indicesForAfter({ id: articlesByUser2[0].id }, { userId: 1 });
    expect(indices1).toBeUndefined();

    const indices2 = await prisma.article
      .fraci("fi")
      .indicesForBefore({ id: articlesByUser1[0].id }, { userId: 2 });
    expect(indices2).toBeUndefined();
  });

  test("inexistent cursor", async () => {
    const photo = await prisma.photo.findUnique({
      where: { id: 999 },
    });
    expect(photo).toBeNull();

    const indicesForLast = await prisma.photo
      .fraci("fi")
      .indicesForBefore({ id: 999 }, { articleId: 999, userId: 1 });
    expect(indicesForLast).toBeUndefined();

    const indicesForFirst = await prisma.photo
      .fraci("fi")
      .indicesForAfter({ id: 999 }, { articleId: 999, userId: 1 });
    expect(indicesForFirst).toBeUndefined();
  });

  test("type check", async () => {
    try {
      const pfi = prisma.photo.fraci("fi");

      // Test `where` argument

      await pfi.indicesForBefore(null, { articleId: 2, userId: 1 });

      // @ts-expect-error missing field
      await pfi.indicesForBefore(null, {});

      // @ts-expect-error missing field
      await pfi.indicesForBefore(null, { articleId: 2 });

      // @ts-expect-error missing field
      await pfi.indicesForBefore(null, { userId: 1 });

      // Test `cursor` argument

      await pfi.indicesForBefore({ id: 1 }, { articleId: 2, userId: 1 });

      // @ts-expect-error missing field
      await pfi.indicesForBefore({}, { articleId: 2, userId: 1 });

      await pfi.indicesForBefore(
        // @ts-expect-error missing field
        { articleId: 2, userId: 1 },
        { articleId: 2, userId: 1 }
      );

      // @ts-expect-error scalar
      await pfi.indicesForBefore(1, { articleId: 2, userId: 1 });

      // @ts-expect-error scalar
      await pfi.indicesForBefore("1", { articleId: 2, userId: 1 });
    } catch {
      // do nothing
    }

    expect(true).toBe(true);
  });
});

test("custom client", async () => {
  let calledCount = 0;
  const customClient = {
    article: {
      findFirst: (...args: any[]) => {
        calledCount++;
        return prisma.photo.findFirst(...args);
      },
      findMany: (...args: any[]) => {
        calledCount++;
        return prisma.photo.findMany(...args);
      },
    },
  } as unknown as PrismaClient;

  const afi = prisma.article.fraci("fi");

  const article = await prisma.article.findUniqueOrThrow({
    where: { id: 1, userId: 1 },
  });

  expect(calledCount).toBe(0);

  await afi.indicesForBefore(
    { id: article.id },
    {
      userId: article.userId,
    },
    customClient
  );
  expect(calledCount).toBe(1);

  await afi.indicesForAfter(
    { id: article.id },
    {
      userId: article.userId,
    },
    customClient
  );
  expect(calledCount).toBe(2);

  await afi.indicesForFirst({ userId: article.userId }, customClient);
  expect(calledCount).toBe(3);

  await afi.indicesForLast({ userId: article.userId }, customClient);
  expect(calledCount).toBe(4);
});
