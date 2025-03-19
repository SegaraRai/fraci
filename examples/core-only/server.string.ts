/* A simple example of using Fraci without any ORM. We strongly recommend using our ORM integrations, as querying fractional indices manually can be error-prone. */

import { zValidator } from "@hono/zod-validator";
import { BASE62, fraciString, type FractionalIndexOf } from "fraci";
import { Hono } from "hono";
import * as z from "zod";
import type { ServerType } from "../common/server-base.js";

// Define the type for our fractional index
type FI = FractionalIndexOf<typeof fraciForExampleItem>;

// Define the structure of our example item
interface ExampleItem {
  readonly id: number;
  readonly name: string;
  readonly fi: FI;
  readonly groupId: number;
}

// In-memory database tables
const exampleItems: ExampleItem[] = [];
let nextId = 1;

// Create a fraci instance for the example items
const fraciForExampleItem = fraciString({
  brand: "core.exampleItem.fi",
  lengthBase: BASE62,
  digitBase: BASE62,
});

// Utility functions for querying the array
const queryUtils = {
  // Find many items with filtering and ordering
  findMany: <
    S extends Partial<Record<keyof ExampleItem, true>> | undefined = undefined,
  >(options: {
    where?: (item: ExampleItem) => boolean;
    orderBy?: { field: keyof ExampleItem; direction: "asc" | "desc" };
    select?: S;
  }): (S extends undefined
    ? ExampleItem
    : Pick<ExampleItem, Extract<keyof S, keyof ExampleItem>>)[] => {
    let results = [...exampleItems];

    // Apply where filter if provided
    if (options.where) {
      results = results.filter(options.where);
    }

    // Apply ordering if provided
    if (options.orderBy) {
      const { field, direction } = options.orderBy;
      results.sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return direction === "asc" ? comparison : -comparison;
      });
    }

    // Apply selection if provided
    if (options.select) {
      return results.map((item) => {
        const result = {} as any;
        for (const key in options.select) {
          if (options.select[key as keyof ExampleItem]) {
            result[key] = item[key as keyof ExampleItem];
          }
        }
        return result;
      });
    }

    return results as any[];
  },

  // Create a new item
  create: (data: Omit<ExampleItem, "id">) => {
    const item: ExampleItem = {
      id: nextId++,
      ...data,
    };
    exampleItems.push(item);
    return item;
  },

  // Update an existing item
  update: (where: Partial<ExampleItem>, data: Partial<ExampleItem>) => {
    // Find the item that matches all conditions in the where clause
    const index = exampleItems.findIndex((item) => {
      for (const key in where) {
        if (
          item[key as keyof ExampleItem] !== where[key as keyof ExampleItem]
        ) {
          return false;
        }
      }
      return true;
    });

    if (index === -1) {
      return null;
    }

    // Update the item
    const updatedItem = {
      ...exampleItems[index],
      ...data,
    };
    exampleItems[index] = updatedItem;
    return updatedItem;
  },
};

// Fraci utility for the example items
// Implementing this manually is strongly discouraged in a real-world application, as it can be error-prone
// Instead, use our built-in ORM integrations for your database
const xfi = {
  // Generate a key between two existing keys
  generateKeyBetween: (a: FI | null, b: FI | null) => {
    return fraciForExampleItem.generateKeyBetween(a, b);
  },

  // Get indices for the last item in a group
  indicesForLast: (where: { groupId: number }) => {
    const items = queryUtils.findMany({
      where: (item) => item.groupId === where.groupId,
      orderBy: { field: "fi", direction: "asc" },
    });
    if (items.length === 0) {
      return [null, null] as [FI | null, FI | null];
    }

    const lastItem = items[items.length - 1] as ExampleItem;
    return [lastItem.fi, null] as [FI | null, FI | null];
  },

  // Get indices for an item before a reference item
  indicesForBefore: (where: { groupId: number }, cursor: { id: number }) => {
    const items = queryUtils.findMany({
      where: (item) => item.groupId === where.groupId,
      orderBy: { field: "fi", direction: "asc" },
    });
    if (items.length === 0) {
      return null;
    }

    const refIndex = items.findIndex((item) => item.id === cursor.id);
    if (refIndex === -1) {
      return null;
    }

    const prev = refIndex > 0 ? items[refIndex - 1].fi : null;
    const curr = items[refIndex].fi;
    return [prev, curr] as [FI | null, FI | null];
  },

  // Get indices for an item after a reference item
  indicesForAfter: (where: { groupId: number }, cursor: { id: number }) => {
    const items = queryUtils.findMany({
      where: (item) => item.groupId === where.groupId,
      orderBy: { field: "fi", direction: "asc" },
    });
    if (items.length === 0) {
      return null;
    }

    const refIndex = items.findIndex((item) => item.id === cursor.id);
    if (refIndex === -1) {
      return null;
    }

    const curr = items[refIndex].fi;
    const next = refIndex < items.length - 1 ? items[refIndex + 1].fi : null;
    return [curr, next] as [FI | null, FI | null];
  },

  // Check if an error is an index conflict error
  isIndexConflictError: (error: unknown) => {
    return (
      error instanceof Error &&
      error.message === "EXAMPLE: Duplicate fractional index"
    );
  },
};

// Function to check for index conflicts
// Implementing this manually is strongly discouraged in a real-world application, as it can be error-prone
// Instead, use the built-in unique constraint handling provided by your database or ORM
function checkIndexConflict(groupId: number, fi: FI): boolean {
  return exampleItems.some(
    (item) => item.groupId === groupId && item.fi === fi,
  );
}

const app = new Hono()
  .get("/groups/:groupId/items", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      queryUtils.findMany({
        where: (item) => item.groupId === groupId,
        orderBy: { field: "fi", direction: "asc" },
        select: { id: true, name: true, fi: true, groupId: true },
      }),
    );
  })
  .get("/groups/:groupId/items.simple", async (c) => {
    const groupId = Number(c.req.param("groupId"));
    return c.json(
      queryUtils.findMany({
        where: (item) => item.groupId === groupId,
        orderBy: { field: "fi", direction: "asc" },
        select: { name: true },
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

      const indices = xfi.indicesForLast({ groupId });

      const delay = Number(c.req.query("delay") ?? "0");
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }

      let retryCount = 0;
      for (const fi of xfi.generateKeyBetween(...indices)) {
        try {
          // Check for index conflicts manually
          if (checkIndexConflict(groupId, fi)) {
            throw new Error("EXAMPLE: Duplicate fractional index");
          }

          // Create the new item
          const newItem = queryUtils.create({ groupId, name, fi });

          return c.json(newItem, 200, {
            "Fraci-Retry-Count": String(retryCount),
          });
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
          // Check for index conflicts manually
          if (checkIndexConflict(groupId, fi)) {
            throw new Error("EXAMPLE: Duplicate fractional index");
          }

          // Update the item
          const updated = queryUtils.update({ id: itemId, groupId }, { fi });

          if (!updated) {
            // The item does not exist
            return c.json({ error: "Item not found" }, 404);
          }

          return c.json(updated, 200, {
            "Fraci-Retry-Count": String(retryCount),
          });
        } catch (error) {
          if (xfi.isIndexConflictError(error)) {
            retryCount++;
            continue;
          }

          return c.json({ error: "Failed to update item (DB Error)" }, 500);
        }
      }
      return c.json({ error: "Failed to update item (Index Conflict)" }, 500);
    },
  ) satisfies ServerType;

export default app;
