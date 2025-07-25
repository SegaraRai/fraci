# Fraci - Fractional Indexing

[![GitHub](https://img.shields.io/badge/GitHub-SegaraRai/fraci-181717?logo=github)](https://github.com/SegaraRai/fraci) [![npm](https://img.shields.io/npm/v/fraci)](https://www.npmjs.com/package/fraci) [![Build Status](https://img.shields.io/github/actions/workflow/status/SegaraRai/fraci/publish.yml)](https://github.com/SegaraRai/fraci/actions) [![MIT License](https://img.shields.io/github/license/SegaraRai/fraci)](https://github.com/SegaraRai/fraci?tab=MIT-1-ov-file) [![API Documentation](https://img.shields.io/badge/docs-online-blue)](https://fraci.roundtrip.dev/) [![llms.txt](https://img.shields.io/badge/docs-llms.txt-blue)](https://fraci.roundtrip.dev/llms.txt) [![llms-full.txt](https://img.shields.io/badge/docs-llms--full.txt-blue)](https://fraci.roundtrip.dev/llms-full.txt)

<p align="center">
  <img src="https://fraci.roundtrip.dev/fraci.svg" alt="Fraci Logo" width="100%" />
</p>

**Fractional indexing that's robust, performant, and secure, with first-class support for Drizzle ORM and Prisma ORM.**

**What is fractional indexing?** It's a technique for maintaining ordered lists in collaborative environments without requiring reindexing. This allows for efficient insertions, deletions, and reordering operations, making it ideal for applications with ordered data such as task lists, kanban boards, or document outlines.

## Quick Start

```shell
# Install the package
npm install fraci
```

```typescript
// With Drizzle ORM (String-based)
import { BASE62, fraciString, type FractionalIndexOf } from "fraci";
import { defineDrizzleFraci, drizzleFraci } from "fraci/drizzle";

// Create a string-based fraci instance
const tasksFraci = fraciString({
  brand: "tasks.fi",
  lengthBase: BASE62,
  digitBase: BASE62,
});

// Or with binary-based fractional indexing for better performance
// import { fraciBinary, type FractionalIndexOf } from "fraci";
// const tasksFraci = fraciBinary({ brand: "tasks.fi" });

// Use it in your schema
export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    fi: text("fi").notNull().$type<FractionalIndexOf<typeof tasksFraci>>(), // For string-based
    // fi: blob("fi", { mode: "buffer" }).notNull().$type<FractionalIndexOf<typeof tasksFraci>>(), // For binary-based
    userId: integer("user_id").notNull(),
  },
  (t) => [uniqueIndex("tasks_user_id_fi_idx").on(t.userId, t.fi)],
);

// Define the fractional index configuration
export const fiTasks = defineDrizzleFraci(
  tasksFraci, // Fraci instance
  tasks, // Table
  tasks.fi, // Fractional index column
  { userId: tasks.userId }, // Group (columns that uniquely identify the group)
  { id: tasks.id }, // Cursor (columns that uniquely identify the row within a group)
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
- **Binary-based fractional indexing** - More efficient storage and processing using `Uint8Array`
- **ORM integrations** - First-class support for Drizzle ORM and Prisma ORM with human-friendly and strongly typed APIs
- **Regeneration on conflict** - Automatic regeneration of fractional indices on conflict
- **TypeScript support** - Strongly typed APIs with branded types (type safety technique to prevent mixing different types) for added protection
- **High performance** - Optimized for performance with minimal overhead
- **Smaller bundle size** - Fully tree-shakable
- **Zero dependencies** - No dependencies, not even on Node.js

### String vs Binary Comparison

| Feature              | String-based                          | Binary-based                             |
| -------------------- | ------------------------------------- | ---------------------------------------- |
| **Storage**          | Stored as text strings                | Stored as binary data (`Uint8Array`)     |
| **Performance**      | Good                                  | Better (faster comparisons, less memory) |
| **Bundle Size**      | 2.06 KiB (Core-only, gzipped)         | 1.55 KiB (Core-only, gzipped)            |
| **Database Column**  | `text` or `varchar`                   | `blob` or `bytea`                        |
| **Visual Debugging** | Easier (human-readable)               | Harder (requires conversion)             |
| **Configuration**    | Requires `digitBase` and `lengthBase` | Simpler configuration                    |

### Bundle Sizes

For bundle size measurement, we use Rolldown for bundling and esbuild for minifying.
Run `bun run build-examples` to see the bundle sizes for each example.

| Integration              | Total Size (minified)     | Total Size (minified + gzipped) |
| ------------------------ | ------------------------- | ------------------------------- |
| **Core only (Binary)**   | 3.50 KiB                  | **1.56 KiB**                    |
| **Core only (String)**   | 4.86 KiB                  | **2.07 KiB**                    |
| **Core only (Both)**     | 7.96 KiB                  | **3.02 KiB**                    |
| **Drizzle ORM (Binary)** | 4.56 KiB (Core +1.06 KiB) | **2.01 KiB** (Core +0.46 KiB)   |
| **Drizzle ORM (String)** | 5.93 KiB (Core +1.07 KiB) | **2.51 KiB** (Core +0.44 KiB)   |
| **Drizzle ORM (Both)**   | 8.99 KiB (Core +1.03 KiB) | **3.46 KiB** (Core +0.44 KiB)   |
| **Prisma ORM (Both)**    | 9.30 KiB (Core +1.35 KiB) | **3.64 KiB** (Core +0.62 KiB)   |

## Security Considerations

### Preventing Cross-Group Operations

- **⚠️ IMPORTANT:** Never accept user input directly as a fractional index. Instead, use fraci's built-in ORM integrations which safely query fractional indices via cursors (record IDs).
- **⚠️ IMPORTANT:** Always filter by group columns (e.g., `userId`) when updating items to prevent cross-group operations.
- The examples in this README demonstrate this pattern with `where` clauses that include both ID and group columns.

### Type Safety

- Fraci uses branded types (a TypeScript technique that adds a unique "brand" to types) to prevent confusion between fractional indices from different columns.
- This provides compile-time protection against mixing indices from different contexts.

### Protection Against Index Expansion Attacks

- Fractional indices can grow in length through repeated operations, especially when repeatedly inserting between the same two indices.
- As shown in the test at the bottom of `fractional-indexing-*.test.ts`, a malicious user could intentionally create very long indices by repeatedly moving items back and forth.
- Fraci includes a configurable `maxLength` parameter (default: 50) to prevent these attacks from creating excessively long indices.
- When this limit is exceeded, an exception is thrown, preventing database bloat and performance degradation.

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
  fraciString,
  type AnyStringFraci,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Define a utility function to create a fractional index column
function fi<Fraci extends AnyStringFraci>(_fraci: () => Fraci) {
  return text().notNull().$type<FractionalIndexOf<Fraci>>();
}

// Define your table with a fractional index column
export const articles = table(
  "articles",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    content: text().notNull(),
    fi: fi(() => fraciForArticles), // Define the fractional index column
    userId: integer()
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    // IMPORTANT: This compound index is necessary for both uniqueness and performance
    uniqueIndex("user_id_fi_idx").on(t.userId, t.fi),
  ],
);

// Create a fraci instance
const fraciForArticles = fraciString({
  brand: "drizzle.articles.fi", // Brand the fractional index type
  lengthBase: BASE62, // Used to represent the length of the integer part (first character)
  digitBase: BASE62, // Determines the radix of the fractional index (second character onward)
  maxRetries: 5, // Maximum number of retries on conflict (default: 5)
  maxLength: 50, // Maximum length to prevent attacks (default: 50)
});

// Export the fractional index configuration
export const fiArticles = defineDrizzleFraci(
  fraciForArticles, // Fraci instance
  articles, // Table
  articles.fi, // Fractional index column
  { userId: articles.userId }, // Group (columns that uniquely identify the group)
  { id: articles.id }, // Cursor (columns that uniquely identify the row within a group)
);
```

> [!TIP]
> The fractional index column should be placed at the end of the compound index for optimal performance.

> [!TIP]
>
> **Using Binary Fractional Index with Drizzle ORM**
>
> For more efficient storage and processing, you can use the binary-encoded fractional index:
>
> ```typescript
> import {
>   fraciBinary,
>   type AnyBinaryFraci,
>   type FractionalIndexOf,
> } from "fraci";
>
> // Define a utility function to create a binary fractional index column
> function fi<Fraci extends AnyBinaryFraci>(_fraci: () => Fraci) {
>   return blob({ mode: "buffer" }).notNull().$type<FractionalIndexOf<Fraci>>();
> }
>
> // Create a binary fraci instance
> const fraciForArticles = fraciBinary({
>   brand: "drizzle.articles.fi", // Brand the fractional index type
>   maxRetries: 5, // Maximum number of retries on conflict (default: 5)
>   maxLength: 50, // Maximum length to prevent attacks (default: 50)
> });
>
> // Use it in your table definition
> export const articles = table(
>   "articles",
>   {
>     // ...other columns
>     fi: fi(() => fraciForArticles), // Binary fractional index column
>     // ...other columns
>   },
>   // ...rest of the table definition
> );
> ```
>
> The binary implementation:
>
> - Uses `Uint8Array` instead of strings for more efficient storage and processing
> - Doesn't require `digitBase` and `lengthBase` parameters
> - Has smaller bundle size (see [Bundle Sizes section](#bundle-sizes))
> - Works with the same API as the string-based implementation

#### 2. CRUD operations with Drizzle ORM

```typescript
import { getFraciErrorCode } from "fraci";
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
  try {
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

    // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
  } catch (error) {
    const code = getFraciErrorCode(error);
    if (code === "MAX_LENGTH_EXCEEDED") {
      throw new HTTPError(500, "Cannot add more items to this group.");
    }
    if (code === "MAX_RETRIES_EXCEEDED") {
      throw new HTTPError(
        503,
        "Too many concurrent requests. Please try again.",
      );
    }
  }
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

  try {
    for (const fi of afi.generateKeyBetween(...indices)) {
      try {
        const result = await db
          .update(articles)
          .set({ fi })
          .where(
            and(
              eq(articles.id, 3),
              eq(articles.userId, 1), // IMPORTANT: Always filter by group columns
            ),
          )
          .returning()
          .get();

        if (!result) {
          throw new Error(
            "Article 3 does not exist or does not belong to user 1.",
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

    // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
  } catch (error) {
    // TODO: Error handling
  }
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

> [!TIP]
> Due to limitations of TypeScript, code after a loop that iterates over an infinite generator will not be inferred to be unreachable, even though it is. We recommend using a wrapper function like the one below, which incorporates common error handling.
>
> ```typescript
> async function withKeyBetween<T, FI extends AnyFractionalIndex>(
>   generator: Generator<FI, never, unknown>,
>   callback: (fi: FI) => Promise<T>,
> ): Promise<T> {
>   try {
>     for (const fi of generator) {
>       try {
>         return await callback(fi);
>       } catch (error) {
>         if (isIndexConflictError(error)) {
>           // Conflict occurred - regenerate and try again
>           continue;
>         }
>         throw error;
>       }
>     }
>
>     // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
>     throw 1; // To make TypeScript happy
>   } catch (error) {
>     const code = getFraciErrorCode(error);
>     if (code === "MAX_LENGTH_EXCEEDED") {
>       throw new HTTPError(500, "Cannot add more items to this group.");
>     }
>     if (code === "MAX_RETRIES_EXCEEDED") {
>       throw new HTTPError(
>         503,
>         "Too many concurrent requests. Please try again.",
>       );
>     }
>     throw error;
>   }
> }
>
> // Example usage
> const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
> if (!indices) {
>   throw new Error("Article 4 does not exist or does not belong to user 1.");
> }
>
> const result = await withKeyBetween(
>   afi.generateKeyBetween(...indices),
>   async (fi) => {
>     return await db
>       .update(articles)
>       .set({ fi })
>       .where(
>         and(
>           eq(articles.id, 3),
>           eq(articles.userId, 1), // IMPORTANT: Always filter by group columns
>         ),
>       )
>       .returning()
>       .get();
>   },
> );
> ```

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

> [!TIP]
>
> **Using Binary Fractional Index with Prisma ORM**
>
> To use binary fractional index with Prisma ORM, define your schema with a `Bytes` type:
>
> ```prisma
> model Article {
>   id Int @id @default(autoincrement())
>   title String
>   content String
>   fi Bytes  // Binary Fractional Index
>   userId Int
>   user User @relation(fields: [userId], references: [id])
>
>   @@unique([userId, fi])
> }
> ```

#### 2. Configure the Prisma extension

```typescript
import { BASE62 } from "fraci";
import { prismaFraci } from "fraci/prisma";
import { PrismaClient } from "./path/to/your/prisma/client.js"; // Adjust the import path as needed

const prisma = new PrismaClient().$extends(
  prismaFraci(PrismaClient, {
    //        ^ Here, you have to pass a PrismaClient constructor or instance to help TypeScript
    //          infer the types correctly. The passed value is NOT used at runtime.
    fields: {
      // Define the fractional index column (table.column)
      "article.fi": {
        group: ["userId"], // Group columns
        digitBase: BASE62, // Determines the radix of the fractional index
        lengthBase: BASE62, // Used to represent the length of the integer part
      },
    },
    maxRetries: 5, // Maximum number of retries on conflict (default: 5)
    maxLength: 50, // Maximum length to prevent attacks (default: 50)
  }),
);
```

> [!TIP]
>
> **Using Binary Fractional Index with Prisma Extension**
>
> To configure the Prisma extension for binary fractional indexing:
>
> ```typescript
> import { prismaFraci } from "fraci/prisma";
> import { PrismaClient } from "./path/to/your/prisma/client.js";
>
> const prisma = new PrismaClient().$extends(
>   prismaFraci(PrismaClient, {
>     fields: {
>       // Define the binary fractional index column
>       "article.fi": {
>         group: ["userId"], // Group columns
>         type: "binary", // Specify binary type instead of digitBase/lengthBase
>       },
>     },
>     maxRetries: 5, // Maximum number of retries on conflict
>     maxLength: 50, // Maximum length to prevent attacks
>   }),
> );
> ```
>
> The usage pattern remains the same as with string-based indices, but with improved performance and smaller storage requirements.

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

  try {
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

    // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
  } catch (error) {
    const code = getFraciErrorCode(error);
    if (code === "MAX_LENGTH_EXCEEDED") {
      throw new HTTPError(500, "Cannot add more items to this group.");
    }
    if (code === "MAX_RETRIES_EXCEEDED") {
      throw new HTTPError(
        503,
        "Too many concurrent requests. Please try again.",
      );
    }
  }
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

  try {
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
            "Article 3 does not exist or does not belong to user 1.",
          );
        }
        throw error;
      }
    }

    // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
  } catch (error) {
    // TODO: Error handling
  }
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

> [!TIP]
> Due to limitations of TypeScript, code after a loop that iterates over an infinite generator will not be inferred to be unreachable, even though it is. We recommend using a wrapper function like the one below, which incorporates common error handling.
>
> ```typescript
> async function withKeyBetween<T, FI extends AnyFractionalIndex>(
>   generator: Generator<FI, never, unknown>,
>   isIndexConflictError: (error: unknown) => boolean,
>   callback: (fi: FI) => Promise<T>,
> ): Promise<T> {
>   try {
>     for (const fi of generator) {
>       try {
>         return await callback(fi);
>       } catch (error) {
>         if (isIndexConflictError(error)) {
>           // Conflict occurred - regenerate and try again
>           continue;
>         }
>         throw error;
>       }
>     }
>
>     // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
>     throw 1; // To make TypeScript happy
>   } catch (error) {
>     const code = getFraciErrorCode(error);
>     if (code === "MAX_LENGTH_EXCEEDED") {
>       throw new HTTPError(500, "Cannot add more items to this group.");
>     }
>     if (code === "MAX_RETRIES_EXCEEDED") {
>       throw new HTTPError(
>         503,
>         "Too many concurrent requests. Please try again.",
>       );
>     }
>     throw error;
>   }
> }
>
> // Example usage
> const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
> if (!indices) {
>   throw new Error("Article 4 does not exist or does not belong to user 1.");
> }
>
> const result = await withKeyBetween(
>   afi.generateKeyBetween(...indices),
>   afi.isIndexConflictError,
>   async (fi) => {
>     return await prisma.article.update({
>       where: {
>         id: 3,
>         userId: 1, // IMPORTANT: Always filter by group columns
>       },
>       data: {
>         fi,
>       },
>     });
>   },
> );
> ```

## How It Works

Fractional indexing allows for inserting items between existing items without reindexing:

### String-based Example (with BASE62)

```text
A (index: "V0") --- B (index: "V1")
                 |
                 +--- New Item (index: "V0V")
```

When you need to insert between A and B, fraci generates a new index that sorts lexicographically (in dictionary order) between them. If you need to insert between A and the new item:

```text
A (index: "V0") --- New Item (index: "V0V") --- B (index: "V1")
                 |
                 +--- Another Item (index: "V0F")
```

### Binary-based Example

```text
A (index: [0x80, 0x00]) --- B (index: [0x80, 0x01])
                         |
                         +--- New Item (index: [0x80, 0x00, 0x80])
```

When you need to insert between A and the new item:

```text
A ([0x80, 0x00]) --- New Item ([0x80, 0x00, 0x80]) --- B ([0x80, 0x01])
                  |
                  +--- Another Item ([0x80, 0x00, 0x40])
```

Fraci handles the generation of these indices automatically, with conflict resolution and type safety.

## Performance Considerations

### Key Performance Optimizations

- **Database Structure:** The compound index structure (`[groupId, fi]`) is optimized for both uniqueness and query performance
- **Character Sets:** Using larger character sets (BASE62, BASE95) results in shorter indices, reducing storage requirements
- **Binary vs String:** Binary-based fractional indexing provides significantly better performance and smaller storage footprint compared to string-based indexing
- **Bundle Size:** Use `fraciBinary` or `fraciString` instead of `fraci` for instantiation to reduce bundle size
- **Efficient Implementation:** The library is designed to minimize allocations and computations during index generation
- **Concurrency:** For optimal performance in high-concurrency scenarios, consider [skipping indices for collision avoidance](#skipping-indices-for-collision-avoidance)

### Performance Impact of Implementation Choices

| Choice            | Impact                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| Binary vs String  | Binary implementation is ~25% smaller and processes faster                        |
| Compound Index    | Ensures efficient queries when filtering by group and sorting by index            |
| Index Length      | Shorter indices (from larger character sets) improve storage and comparison speed |
| Conflict Handling | Automatic regeneration with retry limits prevents performance degradation         |

## Skipping Indices for Collision Avoidance

In concurrent environments, index conflicts occur when multiple operations try to insert items at the same position simultaneously. Since fractional indices are generated in a deterministic sequence, concurrent operations will attempt to use the same index value, resulting in conflicts.

Fraci provides a built-in `skip` parameter in both `generateKeyBetween` and `generateNKeysBetween` methods to address this issue. This parameter allows operations to use different indices in the sequence, reducing or eliminating conflicts.

### How Index Skipping Works

The skipping technique works because:

1. The fractional index generator produces a sequence of valid indices
2. Any index in this sequence is valid for insertion at the desired position
3. By skipping ahead in the sequence, different operations use different indices
4. If conflicts still occur, the normal conflict resolution mechanism handles them

There are two approaches to index skipping:

### Deterministic Skipping with Participant IDs

**When pre-coordination is possible**, this approach guarantees collision avoidance by assigning each participant a unique sequential identifier and deterministically skipping based on this identifier:

```typescript
// Get indices for the position where we want to insert
const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
if (!indices) {
  throw new Error("Reference item not found");
}

// participantId: unique identifier for each participant (0, 1, 2, ...)
const skipCount = participantId;
for (const fi of afi.generateKeyBetween(...indices, skipCount)) {
  // Each participant uses a different index in the sequence
  // No conflict handling needed if all participants use their assigned ID
  await db.insert(items).values({ title: "New Item", fi, userId: 1 });
  return;
}
```

This approach:

- Eliminates randomness
- Guarantees no collisions between participants
- Is ideal when participant identities are known in advance
- Provides predictable index generation

### Random Skipping for Uncoordinated Environments

When pre-coordination isn't possible, random skipping provides a probabilistic approach:

```typescript
// Get indices for the position where we want to insert
const indices = await afi.indicesForAfter({ userId: 1 }, { id: 4 });
if (!indices) {
  throw new Error("Reference item not found");
}

// Skip a random number of indices
const skipCount = Math.floor(Math.random() * 10); // Skip 0-9 indices
try {
  for (const fi of afi.generateKeyBetween(...indices, skipCount)) {
    try {
      await db.insert(items).values({ title: "New Item", fi, userId: 1 });
      return; // Success
    } catch (error) {
      if (isIndexConflictError(error)) {
        // Still need conflict resolution
        continue;
      }
      throw error;
    }
  }

  // Unreachable code, as the `generateKeyBetween` function throws a `MAX_RETRIES_EXCEEDED` error before this point
} catch (error) {
  // TODO: Error handling
}
```

This approach:

- Reduces (but doesn't eliminate) the probability of conflicts
- Works without coordination between participants
- Still requires conflict handling as a fallback

### Efficiency Considerations

For optimal efficiency:

- Keep the number of indices skipped below the encoding radix being used (e.g., less than 36 for BASE36, less than 62 for BASE62, less than 256 for binary encoding)
- Be aware that skipping indices causes the number of digits to increase faster than necessary
- In high-concurrency environments, this trade-off is acceptable since you would need longer indices anyway after conflicts
- Consider your specific use case when choosing between deterministic and random skipping

## Troubleshooting

### Index Conflicts

If you're experiencing frequent index conflicts:

- Ensure your compound unique indices are correctly defined
- Implement the [skipping indices for collision avoidance](#skipping-indices-for-collision-avoidance) technique
- Verify that your conflict detection logic is working correctly

### Type Errors

If you're seeing TypeScript errors related to fractional indices:

- Ensure you're using the correct branded type for each column
- Check that you're passing the correct parameters to `fraci()`
- Ensure your ORM version is compatible with your fraci version (Drizzle ORM v0.30.x - v0.41.x and Prisma v5.x or v6.x required) and that the integration is correctly configured

### Runtime Errors

If you encounter runtime errors:

- `[INITIALIZATION_FAILED] Base string must have at least 4 unique characters` (String-based only)
  - **Cause:** The `digitBase` or `lengthBase` provided to the `fraci()` function has fewer than 4 characters.
  - **Solution:** Ensure both base strings have at least 4 unique characters. Consider using the predefined constants like `BASE62` or `BASE95`.
- `[INITIALIZATION_FAILED] Base string characters must be unique and in ascending order` (String-based only)
  - **Cause:** The characters in the `digitBase` or `lengthBase` are not in ascending order or contain duplicates.
  - **Solution:** Ensure the characters in your base strings are unique and arranged in ascending order by character code. Consider using the predefined constants.
- `[MAX_LENGTH_EXCEEDED] Exceeded maximum length`
  - **Cause:** A generated fractional index has exceeded the configured maximum length (default: 50).
  - **Solution:** Increase the `maxLength` parameter when creating your fraci instance. This could also indicate an index expansion attack, so review your security measures.
- `[MAX_RETRIES_EXCEEDED] Exceeded maximum retries`
  - **Cause:** The maximum number of retries on conflict has been exceeded (default: 5).
  - **Solution:** Implement the [skipping indices for collision avoidance](#skipping-indices-for-collision-avoidance) technique to reduce conflicts. You can also increase the `maxRetries` parameter when creating your fraci instance.
- `[INVALID_FRACTIONAL_INDEX] Invalid indices provided`
  - **Cause:** Invalid fractional indices were provided to key generation functions.
  - **Solution:** Ensure you're using fractional indices generated by the same fraci instance with the same configuration. Make sure you have not mixed up the items in different groups, and that the first argument item in a group is before the second argument item. File an issue if you use the library correctly and still encounter this error.
- `[INTERNAL_ERROR] Unexpected undefined`
  - **Cause:** An internal validation error occurred where a value expected to be defined was undefined.
  - **Solution:** This indicates an internal library error. File an issue with details about how you encountered this error.
- `[INITIALIZATION_FAILED] Could not get field information for <model>.<field>` (Prisma ORM only)
  - **Cause:** When configuring the Prisma extension, the specified model or field doesn't exist or isn't accessible.
  - **Solution:** Regenerate the Prisma client. Verify that the specified field exists in your Prisma schema and is properly defined as a string or binary field. Check for typos in the model or field name. Also ensure your Prisma version is compatible with the fraci/Prisma integration (Prisma v5.x or v6.x required).

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/SegaraRai/fraci?tab=MIT-1-ov-file) file for details.

## Credits

- [Realtime editing of ordered sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by Figma for the idea
- [Implementing Fractional Indexing](https://observablehq.com/@dgreensp/implementing-fractional-indexing) by David Greenspan for the base implementation
