/* A simple example of using Fraci with Prisma ORM. */

import { zValidator } from "@hono/zod-validator";
import { prismaFraci } from "fraci/prisma";
import { Hono } from "hono";
import { Buffer } from "node:buffer";
import * as z from "zod";
import { Prisma } from "../../prisma/client/client.js";
import { setupPrisma } from "../../test/prisma.js";
import type { ServerType } from "../common/server-base.js";

const basePrisma = await setupPrisma();
const prisma = basePrisma.$extends(
  prismaFraci(basePrisma, {
    fields: {
      "binaryExampleItem.fi": {
        group: ["groupId"],
        type: "binary",
      },
    },
  }),
);

const app = new Hono()
  .get("/groups/:groupId/items", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      (
        await prisma.binaryExampleItem.findMany({
          select: { id: true, name: true, fi: true, groupId: true },
          where: { groupId },
          orderBy: { fi: "asc" },
        })
      ).map((item) => ({ ...item, fi: Buffer.from(item.fi).toString("hex") })),
    );
  })
  .get("/groups/:groupId/items.simple", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await prisma.binaryExampleItem.findMany({
        select: { name: true },
        where: { groupId },
        orderBy: { fi: "asc" },
      }),
    );
  })
  .post(
    "/groups/:groupId/items",
    zValidator(
      "json",
      z.object({
        name: z.string(),
      }),
    ),
    zValidator(
      "query",
      z.object({
        delay: z.string().optional(),
      }),
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const { name } = c.req.valid("json");

      const xfi = prisma.binaryExampleItem.fraci("fi");
      const indices = await xfi.indicesForLast({ groupId });

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of xfi.generateKeyBetween(...indices)) {
        try {
          return c.json(
            await prisma.binaryExampleItem.create({
              data: { groupId, name, fi },
            }),
            200,
            {
              "Fraci-Retry-Count": String(retryCount),
            },
          );
        } catch (error) {
          if (xfi.isIndexConflictError(error)) {
            retryCount++;
            continue;
          }

          console.error(error);
          return c.json({ error: "Failed to create item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to create item (Index Conflict)" }, 500);
    },
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
      ]),
    ),
    zValidator(
      "query",
      z.object({
        delay: z.string().optional(),
      }),
    ),
    async (c) => {
      const groupId = Number(c.req.param("groupId"));
      const itemId = Number(c.req.param("itemId"));
      const { before, after } = c.req.valid("json");

      const xfi = prisma.binaryExampleItem.fraci("fi");

      const indices =
        before != null
          ? await xfi.indicesForBefore({ groupId }, { id: before })
          : await xfi.indicesForAfter({ groupId }, { id: after });
      if (!indices) {
        return c.json({ error: "Reference item not found" }, 400);
      }

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of xfi.generateKeyBetween(...indices)) {
        try {
          const updated = await prisma.binaryExampleItem.update({
            // SECURITY: Always filter by group id to prevent cross-reference.
            where: { id: itemId, groupId },
            data: { fi },
          });
          return c.json(updated, 200, {
            "Fraci-Retry-Count": String(retryCount),
          });
        } catch (error) {
          if (xfi.isIndexConflictError(error)) {
            retryCount++;
            continue;
          }

          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
          ) {
            return c.json({ error: "Item not found" }, 404);
          }

          console.error(error);
          return c.json({ error: "Failed to update item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to update item (Index Conflict)" }, 500);
    },
  ) satisfies ServerType;

export default app;
