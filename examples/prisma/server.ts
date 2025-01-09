import { Prisma, PrismaClient } from "@prisma/client";
import { zValidator } from "@hono/zod-validator";
import { BASE64 } from "fraci";
import { fraciExtension } from "fraci/prisma";
import { Hono } from "hono";
import * as z from "zod";

const prisma = new PrismaClient().$extends(
  fraciExtension({
    fields: {
      "exampleItem.fi": {
        group: ["groupId"],
        digitBase: BASE64,
        lengthBase: BASE64,
      },
    } as const,
  })
);

const app = new Hono()
  .post("/cleanup", async () => {
    await prisma.$queryRaw`DELETE FROM exampleItem`;
    await prisma.$queryRaw`DELETE FROM sqlite_sequence WHERE name = 'exampleItem'`;
    await prisma.$queryRaw`VACUUM`;
  })
  .post("/initialize", async () => {
    await prisma.$queryRaw`DELETE FROM exampleItem`;
    await prisma.$queryRaw`DELETE FROM sqlite_sequence WHERE name = 'exampleItem'`;
  })
  .get("/groups/:groupId/items", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await prisma.exampleItem.findMany({
        select: { id: true, name: true, fi: true, groupId: true },
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
    zValidator(
      "query",
      z.object({
        delay: z.string().optional(),
      })
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const { name } = c.req.valid("json");

      const fiHelper = prisma.exampleItem.fraci("fi");
      const indices = await fiHelper.indicesForLast({ groupId });

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of fiHelper.generateKeyBetween(...indices)) {
        try {
          return c.json(
            await prisma.exampleItem.create({
              data: { groupId, name, fi },
            }),
            200,
            {
              "Fraci-Retry-Count": String(retryCount),
            }
          );
        } catch (e) {
          if (fiHelper.isIndexConflictError(e)) {
            retryCount++;
            continue;
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
          before: z.number().int(),
          after: z.null().optional(),
        }),
        z.object({
          before: z.null().optional(),
          after: z.number().int(),
        }),
      ])
    ),
    zValidator(
      "query",
      z.object({
        delay: z.string().optional(),
      })
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const itemId = Number(c.req.param("itemId"));
      const { before, after } = c.req.valid("json");

      const fiHelper = prisma.exampleItem.fraci("fi");

      const indices =
        before != null
          ? await fiHelper.indicesForBefore({ id: before }, { groupId })
          : await fiHelper.indicesForAfter({ id: after }, { groupId });
      if (!indices) {
        return c.json({ error: "Reference item not found" }, 400);
      }

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of fiHelper.generateKeyBetween(indices[0], indices[1])) {
        try {
          const updated = await prisma.exampleItem.update({
            where: { id: itemId },
            data: { fi },
          });
          return c.json(updated, 200, {
            "Fraci-Retry-Count": String(retryCount),
          });
        } catch (e) {
          if (fiHelper.isIndexConflictError(e)) {
            retryCount++;
            continue;
          }

          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2001"
          ) {
            return c.json({ error: "Item not found" }, 404);
          }

          console.error(e);
          return c.json({ error: "Failed to update item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to update item (Index Conflict)" }, 500);
    }
  );

export default app;
