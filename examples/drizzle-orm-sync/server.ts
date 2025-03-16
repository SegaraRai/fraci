/* A simple example of using Fraci with Drizzle ORM and a synchronous database. */

import { zValidator } from "@hono/zod-validator";
import { asc, sql } from "drizzle-orm";
import { drizzleFraciSync } from "fraci/drizzle";
import { Hono } from "hono";
import * as z from "zod";
import { exampleItems, fiExampleItems } from "../../drizzle/schema.js";
import { setupDrizzleDBBunSQLite } from "../../test/drizzle.js";

const db = setupDrizzleDBBunSQLite();

// Fraci does not have a built-in function to detect index conflict errors for Drizzle ORM, since Drizzle ORM does not have a unified error handling mechanism.
function isIndexConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(
      "UNIQUE constraint failed: exampleItem.group_id, exampleItem.fi"
    )
  );
}

const app = new Hono()
  .get("/groups/:groupId/items", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await db.query.exampleItems.findMany({
        columns: { id: true, name: true, fi: true, groupId: true },
        where: sql`${exampleItems.groupId} = ${groupId}`,
        orderBy: asc(exampleItems.fi),
      })
    );
  })
  .get("/groups/:groupId/items.simple", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      await db.query.exampleItems.findMany({
        columns: { name: true },
        where: sql`${exampleItems.groupId} = ${groupId}`,
        orderBy: asc(exampleItems.fi),
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

      const xfi = drizzleFraciSync(db, fiExampleItems);
      const indices = xfi.indicesForLast({ groupId });

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of xfi.generateKeyBetween(...indices)) {
        try {
          return c.json(
            db
              .insert(exampleItems)
              .values({ groupId, name, fi })
              .returning()
              .get(),
            200,
            {
              "Fraci-Retry-Count": String(retryCount),
            }
          );
        } catch (error) {
          if (isIndexConflictError(error)) {
            retryCount++;
            continue;
          }

          console.error(error);
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

      const xfi = drizzleFraciSync(db, fiExampleItems);
      const indices =
        before != null
          ? xfi.indicesForBefore({ groupId }, { id: before })
          : xfi.indicesForAfter({ groupId }, { id: after });
      if (!indices) {
        return c.json({ error: "Reference item not found" }, 400);
      }

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of xfi.generateKeyBetween(indices[0], indices[1])) {
        try {
          const updated = db
            .update(exampleItems)
            .set({
              fi,
            })
            .where(
              // SECURITY: Always filter by group id to prevent cross-reference.
              sql`${exampleItems.id} = ${itemId} AND ${exampleItems.groupId} = ${groupId}`
            )
            .returning()
            .get();
          if (!updated) {
            // The item does not exist
            return c.json({ error: "Item not found" }, 404);
          }

          return c.json(updated, 200, {
            "Fraci-Retry-Count": String(retryCount),
          });
        } catch (error) {
          if (isIndexConflictError(error)) {
            retryCount++;
            continue;
          }

          return c.json({ error: "Failed to update item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to update item (Index Conflict)" }, 500);
    }
  );

export default app;
