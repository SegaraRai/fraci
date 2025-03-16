# fraci - Fractional Indexing

[![GitHub](https://img.shields.io/badge/GitHub-SegaraRai/fraci-181717?logo=github)](https://github.com/SegaraRai/fraci) [![npm](https://img.shields.io/npm/v/fraci)](https://www.npmjs.com/package/fraci) [![Build Status](https://img.shields.io/github/actions/workflow/status/SegaraRai/fraci/publish.yml)](https://github.com/SegaraRai/fraci/actions) [![MIT License](https://img.shields.io/github/license/SegaraRai/fraci)](https://github.com/SegaraRai/fraci?tab=MIT-1-ov-file) [![API Documentation](https://img.shields.io/badge/docs-online-blue)](https://segararai.github.io/fraci)

A comprehensive library for [fractional indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/), offering a strongly typed API and seamless ORM integrations.

**What is fractional indexing?** It's a technique for maintaining ordered lists in collaborative environments without requiring reindexing. This allows for efficient insertions, deletions, and reordering operations, making it ideal for applications with ordered data such as task lists, kanban boards, or document outlines.

## Quick Start

```shell
# Install the package
npm install fraci
```

```typescript
// With Drizzle ORM
import { BASE62, fraci, type FractionalIndexOf } from "fraci";
import { defineDrizzleFraci, drizzleFraci } from "fraci/drizzle";

// Create a fraci instance
const tasksFraci = fraci<typeof BASE62, typeof BASE62, "tasks.fi">({
  digitBase: BASE62,
  lengthBase: BASE62,
});

// Use it in your schema
export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    fi: text("fi").notNull().$type<FractionalIndexOf<typeof tasksFraci>>(),
    userId: integer("user_id").notNull(),
  },
  (t) => [uniqueIndex("tasks_user_id_fi_idx").on(t.userId, t.fi)]
);

// Define the fractional index configuration
export const fiTasks = defineDrizzleFraci(
  tasksFraci, // Fraci instance
  tasks, // Table
  tasks.fi, // Fractional index column
  { userId: tasks.userId }, // Group (columns that uniquely identify the group)
  { id: tasks.id } // Cursor (columns that uniquely identify the row within a group)
);

// Define a helper function to check for index conflicts (may vary by database)
function isIndexConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed:") &&
    error.message.includes(".fi")
  );
}

// Use it in your application
const tfi = drizzleFraci(db, fiTasks);
const indices = await tfi.indicesForLast({ userId: 1 });
for (const fi of tfi.generateKeyBetween(...indices)) {
  try {
    return await db
      .insert(tasks)
      .values({ title: "New Task", fi, userId: 1 })
      .returning()
      .get();
  } catch (error) {
    if (isIndexConflictError(error)) {
      continue;
    }
    throw error;
  }
}
```

See the detailed examples below for more information.

## Key Features

- **Fractional indexing** with arbitrary base characters
- **ORM integrations** - First-class support for Drizzle ORM and Prisma ORM with human-friendly and strongly typed APIs
- **Regeneration on conflict** - Automatic regeneration of fractional indices on conflict
- **TypeScript support** - Strongly typed APIs with branded types for added protection
- **High performance** - Optimized for performance with minimal overhead
- **Smaller bundle size** - Fully tree-shakable
- **Zero dependencies** - No dependencies, not even on Node.js

### Bundle Sizes

For bundle size measurement, we use Rolldown for bundling and esbuild for minifying.
Run `bun run build-examples` to see the bundle sizes for each example.

| Integration     | Total Size (minified)     | Total Size (minified + gzipped) |
| --------------- | ------------------------- | ------------------------------- |
| **Core only**   | 4.51 KiB                  | **1.84 KiB**                    |
| **Drizzle ORM** | 5.61 KiB (Core +1.10 KiB) | **2.29 KiB** (Core +0.45 KiB)   |
| **Prisma ORM**  | 5.90 KiB (Core +1.39 KiB) | **2.48 KiB** (Core +0.64 KiB)   |

## Security Considerations

### Preventing Cross-Group Operations

- **IMPORTANT:** Never accept user input directly as a fractional index. Instead, use fraci's built-in ORM integrations which safely query fractional indices via cursors (record IDs).
- **IMPORTANT:** Always filter by group columns (e.g., `userId`) when updating items to prevent cross-group operations.
- The examples in this README demonstrate this pattern with `where` clauses that include both ID and group columns.

### Type Safety

- Fraci uses branded types to prevent confusion between fractional indices from different columns.
- This provides compile-time protection against mixing indices from different contexts.

### Protection Against Index Expansion Attacks

- Fractional indices can grow in length through repeated operations.
- Fraci includes a configurable `maxLength` parameter (default: 50) to prevent malicious users from creating excessively long indices.
- When this limit is exceeded, an exception is thrown.

## Installation

```shell
npm install fraci

# or
yarn add fraci

# or
pnpm add fraci

# or
bun add fraci
```

> [!NOTE]
> Adding fractional indexing to existing tables is inherently challenging and not supported by our library.
> The following examples assume you are creating a new table.

## Usage

See the `examples` directory for full examples.

### With Drizzle ORM

#### 1. Define your Drizzle schema

```typescript
import {
  BASE62,
  fraci,
  type AnyFractionalIndex,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Utility function for fractional index columns
function fi<FractionalIndex extends AnyFractionalIndex>() {
  return text().notNull().$type<FractionalIndex>();
}

// Define your table with a fractional index column
export const articles = table(
  "articles",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    content: text().notNull(),
    fi: fi<FractionalIndexOf<typeof fraciForArticles>, "fi">("fi"),
    userId: integer()
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    // IMPORTANT: This compound index is necessary for both uniqueness and performance
    uniqueIndex("user_id_fi_idx").on(t.userId, t.fi),
  ]
);

// Create a fraci instance
const fraciForArticles = fraci<
  typeof BASE62,
  typeof BASE62,
  "drizzle.articles.fi"
>({
  digitBase: BASE62, // Determines the radix of the fractional index (second character onward)
  lengthBase: BASE62, // Used to represent the length of the integer part (first character)
  maxRetries: 5, // Maximum number of retries on conflict (default: 5)
  maxLength: 50, // Maximum length to prevent attacks (default: 50)
});

// Export the fractional index configuration
export const fiArticles = defineDrizzleFraci(
  fraciForArticles, // Fraci instance
  articles, // Table
  articles.fi, // Fractional index column
  { userId: articles.userId }, // Group (columns that uniquely identify the group)
  { id: articles.id } // Cursor (columns that uniquely identify the row within a group)
);
```

> [!TIP]
> The fractional index column should be placed at the end of the compound index for optimal performance.

#### 2. CRUD operations with Drizzle ORM

```typescript
import { drizzleFraci } from "fraci/drizzle";
// Or import `drizzleFraciSync` if you're using synchronous database (i.e. Bun SQLite)
import { articles, fiArticles } from "./schema";

// Create your own function to check if the error is a unique constraint error
function isIndexConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed:") &&
    error.message.includes(".fi")
  );
}

// Prepare the database
const db = drizzle(/* ... */);

// Get the helper object
const afi = drizzleFraci(db, fiArticles);

/**
 * Create (append)
 * Append a new article to the end
 */
async function append() {
  // Get the fractional indices to generate the new one that represents the last index
  const indices = await afi.indicesForLast({ userId: 1 });
  //                                         ^ Specify all group columns

  // Generate a new fractional index and handle conflicts
  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      return await db
        .insert(articles)
        .values({
          title: "Hello, world!",
          content: "This is a test article.",
          fi,
          userId: 1,
        })
        .returning()
        .get();
    } catch (error) {
      if (isIndexConflictError(error)) {
        // Conflict occurred - regenerate and try again
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Read (list)
 * List all articles in order
 */
async function list() {
  return await db
    .select()
    .from(articles)
    .where(eq(articles.userId, 1))
    // To sort by fractional index, just use the `ORDER BY` clause
    .orderBy(asc(articles.fi))
    .all();
}

/**
 * Update (move)
 * Move article 3 to the position after article 4
 */
async function move() {
  const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
  //                                          ^ Group        ^ Cursor
  if (!indices) {
    throw new Error("Article 4 does not exist or does not belong to user 1.");
  }

  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      const result = await db
        .update(articles)
        .set({ fi })
        .where(
          and(
            eq(articles.id, 3),
            eq(articles.userId, 1) // IMPORTANT: Always filter by group columns
          )
        )
        .returning()
        .get();

      if (!result) {
        throw new Error(
          "Article 3 does not exist or does not belong to user 1."
        );
      }
      return result;
    } catch (error) {
      if (isIndexConflictError(error)) {
        // Conflict occurred - regenerate and try again
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Delete
 */
async function remove() {
  // Just delete the item. No need to touch the fractional index.
  // There is no need to modify the fractional index even for soft delete.
  await db.delete(articles).where(eq(articles.id, 3));
}
```

### With Prisma ORM

#### 1. Define your Prisma schema

```prisma
model Article {
  id Int @id @default(autoincrement())
  title String
  content String
  fi String  // Fractional Index
  userId Int
  user User @relation(fields: [userId], references: [id])

  // IMPORTANT: This compound unique index is necessary for both uniqueness and performance
  // The fractional index column should be placed at the end of the index
  @@unique([userId, fi])
}
```

#### 2. Configure the Prisma extension

```typescript
import { PrismaClient } from "@prisma/client";
import { BASE62 } from "fraci";
import { prismaFraci } from "fraci/prisma";

const prisma = new PrismaClient().$extends(
  prismaFraci({
    fields: {
      // Define the fractional index column (table.column)
      "article.fi": {
        group: ["userId"], // Group columns
        digitBase: BASE62, // Determines the radix of the fractional index
        lengthBase: BASE62, // Used to represent the length of the integer part
      },
    } as const,
    maxRetries: 5, // Maximum number of retries on conflict (default: 5)
    maxLength: 50, // Maximum length to prevent attacks (default: 50)
  })
);
```

#### 3. CRUD operations with Prisma ORM

```typescript
// Get the helper object
const afi = prisma.article.fraci("fi");
//                 ^ Table        ^ Column

/**
 * Create (append)
 * Append a new article to the end
 */
async function append() {
  // Get the fractional indices to generate the new one that represents the last index
  const indices = await afi.indicesForLast({ userId: 1 });
  //                                         ^ Specify all group columns

  // Generate a new fractional index and handle conflicts
  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      return await prisma.article.create({
        data: {
          title: "Hello, world!",
          content: "This is a test article.",
          fi,
          userId: 1,
        },
      });
    } catch (error) {
      if (afi.isIndexConflictError(error)) {
        // Conflict occurred - regenerate and try again
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Read (list)
 * List all articles in order
 */
async function list() {
  return await prisma.article.findMany({
    where: {
      userId: 1,
    },
    // To sort by fractional index, just use the `orderBy` property
    orderBy: {
      fi: "asc",
    },
  });
}

/**
 * Update (move)
 * Move article 3 to the position after article 4
 */
async function move() {
  const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
  //                                          ^ Group        ^ Cursor
  if (!indices) {
    throw new Error("Article 4 does not exist or does not belong to user 1.");
  }

  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      await prisma.article.update({
        where: {
          id: 3,
          userId: 1, // IMPORTANT: Always filter by group columns
        },
        data: {
          fi,
        },
      });
      return;
    } catch (error) {
      if (afi.isIndexConflictError(error)) {
        // Conflict occurred - regenerate and try again
        continue;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error(
          "Article 3 does not exist or does not belong to user 1."
        );
      }
      throw error;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Delete
 */
async function remove() {
  // Just delete the item. No need to touch the fractional index.
  await prisma.article.delete({
    where: {
      id: 3,
    },
  });
}
```

## How It Works

Fractional indexing allows for inserting items between existing items without reindexing:

```text
A (index: "a") --- B (index: "c")
                |
                +--- New Item (index: "b")
```

When you need to insert between A and B, fraci generates a new index that sorts lexicographically between them. If you need to insert between A and the new item:

```text
A (index: "a") --- New Item (index: "b") --- B (index: "c")
                |
                +--- Another Item (index: "a5")
```

Fraci handles the generation of these indices automatically, with conflict resolution and type safety.

> [!NOTE]
> The indices shown in these examples ("a", "b", "c", "a5") are simplified for illustrative purposes only. The actual indices generated by the library will have a different format based on your chosen character base and will include length encoding characters. For example, with the default BASE62 configuration, actual indices might look more like "V0", "V1", "V2", "V0V", etc.

## Performance Considerations

- The compound index structure (`[groupId, fi]`) is optimized for both uniqueness and query performance
- Using larger character sets (BASE62, BASE95) results in shorter indices, reducing storage requirements
- The library is designed to minimize allocations and computations during index generation
- For optimal performance in high-concurrency scenarios, consider [skipping indices randomly](#skipping-indices-randomly)

## Skipping Indices Randomly

In highly concurrent environments, you may experience index conflicts when multiple operations try to insert items at the same position simultaneously. Since fractional indices are generated in a deterministic sequence, concurrent operations will attempt to use the same index value.

For example, the first fractional index generated between `a` and `b` is always `a5` (see the note in the [How It Works](#how-it-works) section about simplified indices). If multiple operations try to insert between `a` and `b` at the same time, they'll all try to use `a5`, resulting in conflicts.

To reduce conflicts, fraci provides a built-in `skip` parameter in both `generateKeyBetween` and `generateNKeysBetween` methods. This parameter is implemented directly in the methods to work correctly with the `maxRetries` parameter:

```typescript
// Get indices for the position where we want to insert
const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
if (!indices) {
  throw new Error("Reference item not found");
}

// Skip a random number of indices to reduce collision probability
const skipCount = Math.floor(Math.random() * 10); // Skip 0-9 indices (adjust as needed)
for (const fi of afi.generateKeyBetween(...indices, skipCount)) {
  try {
    // Insert with the randomly advanced index
    await db.insert(items).values({ title: "New Item", fi, userId: 1 });
    return; // Success
  } catch (error) {
    // Still handle potential conflicts
    if (isIndexConflictError(error)) {
      // Continue with normal conflict resolution
      continue;
    }
    throw error;
  }
}

throw new Error("Failed to generate a new fractional index.");
```

This technique works because:

1. The fractional index generator produces a sequence of valid indices
2. Any index in this sequence is valid for insertion at the desired position
3. By randomly skipping ahead, different concurrent operations are likely to use different indices
4. Even if conflicts still occur, the normal conflict resolution mechanism will handle them

This approach is particularly effective in scenarios with many concurrent users modifying the same ordered list.

### Trade-offs of Skipping Indices

While randomly skipping indices reduces conflicts in concurrent environments, it does come with a trade-off:

- In environments where collisions rarely occur, skipping indices causes the number of digits in the indices to increase faster than necessary
- This is because the second and subsequent indices in a sequence always have more digits than the first index
- As a result, index space is consumed approximately twice as quickly when skipping is used
- However, in high-concurrency environments where collisions are common, this disadvantage is minimal since you would need to use the longer indices anyway after the first collision

Consider your specific use case when deciding whether to implement random index skipping.

## Troubleshooting

### Index Conflicts

If you're experiencing frequent index conflicts:

- Ensure your compound unique indices are correctly defined
- Implement the [skipping indices randomly](#skipping-indices-randomly) technique
- Verify that your conflict detection logic is working correctly

### Type Errors

If you're seeing TypeScript errors related to fractional indices:

- Ensure you're using the correct branded type for each column
- Check that you're passing the correct parameters to `fraci()`
- Ensure your ORM version is compatible with your fraci version (Drizzle ORM v0.30.x - v0.40.x and Prisma v5.x or v6.x required) and that the integration is correctly configured

### Runtime Errors

If you encounter runtime errors:

- `Fraci: Base string must have at least 4 unique characters`
  - **Cause:** The `digitBase` or `lengthBase` provided to the `fraci()` function has fewer than 4 characters.
  - **Solution:** Ensure both base strings have at least 4 unique characters. Consider using the predefined constants like `BASE62` or `BASE95`.
- `Fraci: Base string characters must be unique and in ascending order`
  - **Cause:** The characters in the `digitBase` or `lengthBase` are not in ascending order or contain duplicates.
  - **Solution:** Ensure the characters in your base strings are unique and arranged in ascending order by character code. Consider using the predefined constants.
- `Fraci: Exceeded maximum length`
  - **Cause:** A generated fractional index has exceeded the configured maximum length (default: 50).
  - **Solution:** Increase the `maxLength` parameter when creating your fraci instance. This could also indicate an index expansion attack, so review your security measures.
- `Fraci: Invalid indices provided`
  - **Cause:** Invalid fractional indices were provided to key generation functions.
  - **Solution:** Ensure you're using fractional indices generated by the same fraci instance with the same configuration. File an issue if you use the library correctly and still encounter this error.
- `Fraci Internal: Unexpected undefined`
  - **Cause:** An internal validation error occurred where a value expected to be defined was undefined.
  - **Solution:** This indicates an internal library error. File an issue with details about how you encountered this error.
- `Fraci Prisma: Could not get field information for <model>.<field>` (Prisma ORM only)
  - **Cause:** When configuring the Prisma extension, the specified model or field doesn't exist or isn't accessible.
  - **Solution:** Verify that the specified field exists in your Prisma schema and is properly defined as a string field. Check for typos in the model or field name. Also ensure your Prisma version is compatible with the fraci/prisma integration (Prisma v5.x or v6.x required).

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/SegaraRai/fraci/blob/main/LICENSE) file for details.

## Credits

- [Realtime editing of ordered sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by Figma for the idea
- [Implementing Fractional Indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by David Greenspan for the base implementation
