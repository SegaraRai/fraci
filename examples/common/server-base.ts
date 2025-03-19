import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";

interface ExampleItem {
  readonly id: number;
  readonly name: string;
  readonly fi: string;
  readonly groupId: number;
}

function anyOf<T>(results: T[]): T {
  return results[Math.floor(Math.random() * results.length)];
}

const app = new Hono()
  .get("/groups/:groupId/items", async (c) => {
    return c.json([] as ExampleItem[]);
  })
  .get("/groups/:groupId/items.simple", async (c) => {
    return c.json([] as { name: string }[]);
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
      return anyOf([
        c.json({} as unknown as ExampleItem, 200),
        c.json({ error: "Failed to create item (DB Error)" as const }, 500),
        c.json(
          { error: "Failed to create item (Index Conflict)" as const },
          500
        ),
      ]);
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
      return anyOf([
        c.json({} as unknown as ExampleItem, 200),
        c.json({ error: "Reference item not found" } as const, 400),
        c.json({ error: "Item not found" } as const, 404),
        c.json({ error: "Failed to update item (DB Error)" } as const, 500),
        c.json(
          { error: "Failed to update item (Index Conflict)" } as const,
          500
        ),
      ]);
    }
  );

export type ServerType = typeof app;
