# fraci - Fractional Indexing

[![npm](https://img.shields.io/npm/v/fraci)](https://www.npmjs.com/package/fraci) [![build status](https://img.shields.io/github/actions/workflow/status/SegaraRai/fraci/publish.yml)](https://github.com/SegaraRai/fraci/actions) [![MIT License](https://img.shields.io/github/license/SegaraRai/fraci)](https://github.com/SegaraRai/fraci?tab=MIT-1-ov-file)

A comprehensive library for [fractional indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/), offering a strongly typed API and seamless ORM integrations.

## Key Features

- **Fractional indexing** with arbitrary base characters.
- **ORM integrations** - First-class support for Drizzle ORM and Prisma ORM with human-friendly and strongly typed APIs.
- **Regeneration on conflict** - Automatic regeneration of fractional indexes on conflict.
- **TypeScript support** - Strongly typed APIs with branded types for added protection.
- **High performance** - Optimized for performance with minimal overhead.
- **Smaller bundle size** - Fully tree-shakable.
- **Zero dependencies** - No dependencies, not even on Node.js.

## Getting Started

> [!NOTE]
> Adding fractional indexing to existing tables is inherently challenging and not supported by our library.
> The following steps assume you are creating a new table.

See the `examples` directory for full examples.

### With Drizzle ORM

Step 1. Install the package.

```bash
npm install fraci

# or
yarn add fraci

# or
pnpm add fraci

# or
bun add fraci
```

Step 2. Create a new table with a fractional index column.

```typescript
import {
  BASE64,
  fraci,
  type AnyFractionalIndex,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Utility function to define a fractional index column. Should be copied to your project.
function fi<FractionalIndex extends AnyFractionalIndex>() {
  return text().notNull().$type<FractionalIndex>();
}

// Articles table
export const articles = table(
  "articles",
  {
    id: integer().primaryKey({ autoIncrement: true }),

    // Some random columns...
    title: text().notNull(),
    content: text().notNull(),

    // **Fractional index column**
    // It is necessary to know in which group the fractional index is defined. In this case, we assume that it is an index on the same `userId`.
    // If you wish to order the entire table, you may choose to use a fractional index with no groups.
    fi: fi<FractionalIndexOf<typeof fraciForArticles>, "fi">("fi"),

    // Foreign key
    userId: integer()
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    // **IMPORTANT:** The following compound unique index is necessary to ensure that the fractional index is unique within the group, and to improve the performance of the query.
    // The fractional index column should be placed at the end of the index. This improves performance by using the index even when searching only by group (in this case `userId`).
    uniqueIndex("user_id_fi_idx").on(t.userId, t.fi),
  ]
);

// Here, we create a fraci instance for the articles table.
// You can either 1) create a new instance or 2) use the same instance for multiple fractional index columns.
// When sharing instances, please be careful not to confuse fractional indices of different tables/columns, as the branded type will not function.
const fraciForArticles = fraci<
  typeof BASE64, // Digit base
  typeof BASE64, // Length base
  "drizzle.articles.fi" // Branding string. Any string is fine.
>({
  // The base properties are used to define the base characters of the fractional index.
  // - `digitBase` determines the radix of the fractional index and is used from the second character onward.
  // - `lengthBase` is used to represent the length of the integer part of the fractional index and is used as the first character of the index.
  // Both `digitBase` and `lengthBase` are more space efficient with more characters. It is recommended to use at least 10 characters.
  //
  // Example:
  // - To always start with a lowercase letter and have the second and subsequent letters be lowercase letters and numbers,
  //   set `lengthBase` to `abcdefghijklmnopqrstuvwxyz` (`BASE26`) and `digitBase` to `0123456789abcdefghijklmnopqrstuvwxyz` (`BASE36`).
  digitBase: BASE64,
  lengthBase: BASE64,
  // The maximum number of retries to generate a new fractional index when a conflict occurs.
  // The default is 5.
  maxRetries: 5,
  // The maximum length of the fractional index.
  // Fractional index can be made infinitely long by repeating certain operations.
  // To prevent attacks by malicious users, fraci allows a maximum length to be specified for stopping new creation.
  // The default is 50.
  maxLength: 50,
});

// Export the fractional index configuration for the articles table.
export const fiArticles = defineDrizzleFraci(
  fraciForArticles, // Fraci instance
  articles, // Table
  articles.fi, // Fractional index column
  { id: articles.id }, // Cursor (columns that are used to find the row uniquely in the group)
  { userId: articles.userId } // Group (columns that are used to find the group uniquely)
);
```

Step 3. CRUD operations.

```typescript
import { drizzleFraci } from "fraci/drizzle";
// Or import `drizzleFraciSync` if you're using synchronous database (i.e. Bun SQLite).
import { articles, fiArticles } from "path/to/your/schema";

// Create your own function to check if the error is a unique constraint error.
// This may vary depending on the database driver you are using. Here's an example for Bun SQLite.
function isIndexConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed:") &&
    error.message.includes(".fi")
  );
}

// Prepare the database.
const db = drizzle(/* ... */);

// Get the helper object.
const afi = drizzleFraci(db, fiArticles);

/**
 * Create (append)
 * Append a new article to the end.
 */
async function append() {
  // Get the fractional indices to generate the new one that represents the last index.
  // `await` is only necessary for asynchronous databases.
  const indices = await afi.indicesForLast({ userId: 1 });
  //                                         ^ Here, it's required to specify all columns specified in the group.

  // Generate a new fractional index.
  // Note that the `generateKeyBetween` method is a generator to handle conflicts.
  // If you don't want to handle conflicts, you can just do: `const [fi] = afi.generateKeyBetween(...indices);`.
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
    } catch (e) {
      if (isIndexConflictError(e)) {
        // Conflict occurred. (the same operation has been performed simultaneously)
        // Regenerate the fractional index and try again.
        continue;
      }

      throw e;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Read (list)
 * List all articles in order.
 */
async function list() {
  return await db
    .select()
    .from(articles)
    .where(eq(articles.userId, 1))
    // To sort by fractional index, just use the `ORDER BY` clause.
    .orderBy(asc(articles.fi))
    .all();
}

/**
 * Update (move)
 * Move article 3 to the position after article 4.
 */
async function move() {
  const indices = await afi.indicesForAfter({ id: 4 }, { userId: 1 });
  //                                          ^ Here, one or more properties must be specified that uniquely identify the row.
  //                                                     ^ Here, it's required to specify all columns specified in the `group` property above.
  if (!indices) {
    throw new Error("Article 4 does not exist or does not belong to user 1.");
  }

  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      const result = await db
        .update(articles)
        .set({
          fi,
        })
        .where(
          and(
            eq(articles.id, 3),
            eq(articles.userId, 1) // IMPORTANT: It's required to specify the group columns here to prevent cross-group operations.
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
    } catch (e) {
      if (isIndexConflictError(e)) {
        // Conflict occurred.
        // Regenerate the fractional index and try again.
        continue;
      }

      throw e;
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
  await db.delete(article).where(eq(articles.id, 3));
}
```

### With Prisma ORM

Step 1. Install the package.

```bash
npm install fraci

# or
yarn add fraci

# or
pnpm add fraci

# or
bun add fraci
```

Step 2. Create a new table with a fractional index column.

```prisma
model Article {
  id Int @id @default(autoincrement())

  // Some random columns...
  title String
  content String

  // **Fractional index column**
  // It is necessary to know in which group the fractional index is defined. In this case, we assume that it is an index on the same `userId`.
  // If you wish to order the entire table, you may choose to use a fractional index with no groups.
  fi String

  // Foreign key
  userId Int
  user User @relation(fields: [userId], references: [id])

  // **IMPORTANT:** The following compound unique index is necessary to ensure that the fractional index is unique within the group, and to improve the performance of the query.
  // The fractional index column should be placed at the end of the index. This improves performance by using the index even when searching only by group (in this case `userId`).
  // `@@unique` should translate to UNIQUE INDEX by Prisma, but if it does to UNIQUE CONSTRAINT, manually modify the migration file or create a separate index.
  @@unique([userId, fi])
}
```

Step 3. Use the Prisma extension of `fraci`.

```typescript
import { PrismaClient } from "@prisma/client";
import { BASE64 } from "fraci";
import { fraciExtension } from "fraci/prisma";

const prisma = new PrismaClient().$extends(
  fraciExtension({
    fields: {
      // Here, we define the fractional index column.
      // The notation is as follows: `table.column`.
      "article.fi": {
        // The group property is used to define the group of fractional indexes.
        group: ["userId"],
        // The base properties are used to define the base characters of the fractional index.
        // - `digitBase` determines the radix of the fractional index and is used from the second character onward.
        // - `lengthBase` is used to represent the length of the integer part of the fractional index and is used as the first character of the index.
        // Both `digitBase` and `lengthBase` are more space efficient with more characters. It is recommended to use at least 10 characters.
        //
        // Example:
        // - To always start with a lowercase letter and have the second and subsequent letters be lowercase letters and numbers,
        //   set `lengthBase` to `abcdefghijklmnopqrstuvwxyz` (`BASE26`) and `digitBase` to `0123456789abcdefghijklmnopqrstuvwxyz` (`BASE36`).
        digitBase: BASE64,
        lengthBase: BASE64,
      },
      // You can add more fractional index columns if you want.
      // "anotherTable.anotherColumn": { ... },
    } as const,
    // The maximum number of retries to generate a new fractional index when a conflict occurs.
    // The default is 5.
    maxRetries: 5,
    // The maximum length of the fractional index.
    // Fractional index can be made infinitely long by repeating certain operations.
    // To prevent attacks by malicious users, fraci allows a maximum length to be specified for stopping new creation.
    // The default is 50.
    maxLength: 50,
  })
);
```

Step 4. CRUD operations.

```typescript
// Get the helper object.
// Only predefined table and column name combinations are available due to strong typing.
const afi = prisma.article.fraci("fi");
//                 ^ Table        ^ Column

/**
 * Create (append)
 * Append a new article to the end.
 */
async function append() {
  // Get the fractional indices to generate the new one that represents the last index.
  const indices = await afi.indicesForLast({ userId: 1 });
  //                                         ^ Here, it's required to specify all columns specified in the `group` property above.

  // Generate a new fractional index.
  // Note that the `generateKeyBetween` method is a generator to handle conflicts.
  // If you don't want to handle conflicts, you can just do: `const [fi] = afi.generateKeyBetween(...indices);`.
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
    } catch (e) {
      if (afi.isIndexConflictError(e)) {
        // Conflict occurred. (the same operation has been performed simultaneously)
        // Regenerate the fractional index and try again.
        continue;
      }

      throw e;
    }
  }

  throw new Error("Failed to generate a new fractional index.");
}

/**
 * Read (list)
 * List all articles in order.
 */
async function list() {
  return await prisma.article.findMany({
    where: {
      userId: 1,
    },
    // To sort by fractional index, just use the `orderBy` property.
    orderBy: {
      fi: "asc",
    },
  });
}

/**
 * Update (move)
 * Move article 3 to the position after article 4.
 */
async function move() {
  const indices = await afi.indicesForAfter({ id: 4 }, { userId: 1 });
  //                                          ^ Here, one or more properties must be specified that uniquely identify the row.
  //                                                     ^ Here, it's required to specify all columns specified in the `group` property above.
  if (!indices) {
    throw new Error("Article 4 does not exist or does not belong to user 1.");
  }

  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      await prisma.article.update({
        where: {
          id: 3,
          userId: 1, // IMPORTANT: It's required to specify the group columns here to prevent cross-group operations.
        },
        data: {
          fi,
        },
      });

      return;
    } catch (e) {
      if (afi.isIndexConflictError(e)) {
        // Conflict occurred.
        // Regenerate the fractional index and try again.
        continue;
      }

      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        throw new Error(
          "Article 3 does not exist or does not belong to user 1."
        );
      }

      throw e;
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
  await prisma.article.delete({
    where: {
      id: 3,
    },
  });
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/SegaraRai/fraci/blob/main/LICENSE) file for details.

## Credits

- [Realtime editing of ordered sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by Figma for the idea
- [Implementing Fractional Indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by David Greenspan for the base implementation
