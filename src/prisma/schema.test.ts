// Note that this test needs the package to be built before running and type checking.
import { expect, test } from "bun:test";
import { BASE26L, BASE36L } from "fraci";
import { definePrismaFraci } from "fraci/prisma";

test("definePrismaFraci type check", () => {
  expect(
    definePrismaFraci({
      fields: {
        "article.fi": {
          group: [],
          digitBase: BASE36L,
          lengthBase: BASE26L,
        },
        "photo.fi": {
          group: [],
          digitBase: BASE36L,
          lengthBase: BASE26L,
        },
      },
    })
  ).toEqual({
    fields: {
      "article.fi": {
        group: [],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
      "photo.fi": {
        group: [],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });

  definePrismaFraci({
    fields: {
      // @ts-expect-error Only existing fields can be specified.
      "notExist.fi": {
        group: [],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });

  definePrismaFraci({
    fields: {
      // @ts-expect-error Only existing fields can be specified.
      "article.notExist": {
        group: [],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });

  definePrismaFraci({
    fields: {
      "article.fi": {
        // @ts-expect-error Only existing fields can be specified.
        group: ["altText"],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });

  definePrismaFraci({
    fields: {
      "article.fi": {
        // @ts-expect-error Only serializable fields can be specified.
        group: ["createdAt"],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });

  definePrismaFraci({
    fields: {
      "article.fi": {
        // @ts-expect-error The fractional index field itself cannot be specified.
        group: ["fi"],
        digitBase: BASE36L,
        lengthBase: BASE26L,
      },
    },
  });
});
