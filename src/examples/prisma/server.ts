import { Prisma, PrismaClient } from "@prisma/client";
import { zValidator } from "@hono/zod-validator";
import { createFractionalIndexingExtension } from "fraci/prisma";
import { Hono } from "hono";
import * as z from "zod";
import { BASE64 } from "../../bases";

const prisma = new PrismaClient().$extends(
  createFractionalIndexingExtension({
    fields: {
      "exampleItem.fi": {
        group: ["groupId"],
        digitBase: BASE64,
        lengthBase: BASE64,
      },
    } as const,
    sign: {
      secret: "SECRET",
      encoding: "base64url",
    },
  })
);

const app = new Hono()
  .post("/cleanup", async () => {
    await prisma.$queryRaw`DELETE FROM exampleItem`;
    await prisma.$queryRaw`VACUUM`;
  })
  .post("/initialize", async () => {
    await prisma.$queryRaw`DELETE FROM exampleItem`;
  })
  .get("/groups/:groupId/items", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await prisma.exampleItem.findMany({
        where: { groupId },
        orderBy: { fi: "asc" },
      })
    );
  })
  .get("/groups/:groupId/items.simple", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await prisma.exampleItem.findMany({
        select: { name: true },
        where: { groupId },
        orderBy: { fi: "asc" },
      })
    );
  })
  .post(
    "/groups/:groupId/items",
    zValidator(
      "json",
      z.object({
        name: z.string(),
      })
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const { name } = c.req.valid("json");
      const lastItem = await prisma.exampleItem.findFirst({
        where: { groupId },
        orderBy: { fi: "desc" },
      });
      const fiGenerator = prisma.exampleItem
        .fractionalIndexing("fi")
        .generateKeyBetween(lastItem?.__fi_fi ?? null, null);
      for (const fi of fiGenerator) {
        try {
          return c.json(
            await prisma.exampleItem.create({
              data: { groupId, name, fi },
            })
          );
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2002") {
              continue;
            }
          }
          console.error(e);
          return c.json({ error: "Failed to create item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to create item (Index Conflict)" }, 500);
    }
  )
  .post(
    "/groups/:groupId/items/:itemId/order",
    zValidator(
      "json",
      z.union([
        z.object({
          beforeKey: z.string(),
          beforeKeySignature: z.string(),
          afterKey: z.string(),
          afterKeySignature: z.string(),
        }),
        z.object({
          beforeKey: z.string(),
          beforeKeySignature: z.string(),
          afterKey: z.optional(z.null()),
          afterKeySignature: z.optional(z.null()),
        }),
        z.object({
          beforeKey: z.optional(z.null()),
          beforeKeySignature: z.optional(z.null()),
          afterKey: z.string(),
          afterKeySignature: z.string(),
        }),
      ])
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const itemId = Number(c.req.param("itemId"));
      const { beforeKey, beforeKeySignature, afterKey, afterKeySignature } =
        c.req.valid("json");

      const beforeFI =
        beforeKey && beforeKeySignature
          ? prisma.exampleItem
              .fractionalIndexing("fi")
              .parse(beforeKey, beforeKeySignature, { groupId })
          : null;
      const afterFI =
        afterKey && afterKeySignature
          ? prisma.exampleItem
              .fractionalIndexing("fi")
              .parse(afterKey, afterKeySignature, { groupId })
          : null;
      if (beforeFI === undefined || afterFI === undefined) {
        return c.json({ error: "Invalid signature" }, 400);
      }

      const fiGenerator = prisma.exampleItem
        .fractionalIndexing("fi")
        .generateKeyBetween(beforeFI, afterFI);
      for (const fi of fiGenerator) {
        try {
          const updated = await prisma.exampleItem.update({
            where: { id: itemId },
            data: { fi },
          });
          return c.json(updated);
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === "P2001") {
              return c.json({ error: "Item not found" }, 404);
            }
            if (e.code === "P2002") {
              continue;
            }
          }
          console.error(e);
          return c.json({ error: "Failed to update item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to update item (Index Conflict)" }, 500);
    }
  );

export default app;
