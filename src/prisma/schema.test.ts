// Note that this test needs the package to be built before running and type checking.
import { expect, test } from "bun:test";
import { BASE26L, BASE36L } from "fraci";
import { definePrismaFraci } from "fraci/prisma";
import { PrismaClient } from "../../prisma/client";

test("definePrismaFraci type check", () => {
  expect(
    definePrismaFraci(PrismaClient, {
      fields: {
        "article.fi": {
          group: [],
          lengthBase: BASE26L,
          digitBase: BASE36L,
        },
        "photo.fi": {
          group: [],
          lengthBase: BASE26L,
          digitBase: BASE36L,
        },
      },
    }),
  ).toEqual({
    fields: {
      "article.fi": {
        group: [],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
      "photo.fi": {
        group: [],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });

  definePrismaFraci(PrismaClient, {
    fields: {
      // @ts-expect-error Only existing fields can be specified.
      "notExist.fi": {
        group: [],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });

  definePrismaFraci(PrismaClient, {
    fields: {
      // @ts-expect-error Only existing fields can be specified.
      "article.notExist": {
        group: [],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });

  definePrismaFraci(PrismaClient, {
    fields: {
      "article.fi": {
        // @ts-expect-error Only existing fields can be specified.
        group: ["altText"],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });

  definePrismaFraci(PrismaClient, {
    fields: {
      "article.fi": {
        // @ts-expect-error Only serializable fields can be specified.
        group: ["createdAt"],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });

  definePrismaFraci(PrismaClient, {
    fields: {
      "article.fi": {
        // @ts-expect-error The fractional index field itself cannot be specified.
        group: ["fi"],
        lengthBase: BASE26L,
        digitBase: BASE36L,
      },
    },
  });
});
