# fraci - Fractional Indexing

An implementation of [fractional indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) in TypeScript, focused on practicality and ease of use.

## Key Features

- **Fractional indexing** with arbitrary base characters.
- **Prisma integration** - First-class support for Prisma with human-friendly APIs.
- **Regeneration on conflict** - Automatic regeneration of fractional indexes on conflict.
- **TypeScript support** - Protection with Branded Types.
- **High performance** - Optimized for performance with minimal overhead.
- **Less bundle size** - Fully tree-shakable. Mangleable except for user options.
- **Zero dependencies** - No dependence on Node.js either.

## Getting Started

### With Prisma

> **Warning:** Fractional Indexing, by its very nature, is difficult to add to existing tables, and our library does not currently support adding it to existing tables.
> The following steps are based on the assumption that you are creating a new table.

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
import { createFractionalIndexingExtension } from "fraci/prisma";

const prisma = new PrismaClient().$extends(
  createFractionalIndexingExtension({
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
    } as const,
    // The maximum number of retries to generate a new fractional index when a conflict occurs.
    // The default is 10.
    maxRetries: 10,
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
// Get helper object
const afi = prisma.article.fractionalIndexing("fi");
//                 ^table                     ^column

// Create (append)
async function append() {
  // Get the fractional indices to generate the new one that represents the last index.
  const indices = await afi.getIndicesForLast({ userId: 1 });
  // Generate a new fractional index.
  // Note that the `generateKeyBetween` method is a generator to handle conflicts.
  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      const article = await prisma.article.create({
        data: {
          title: "Hello, world!",
          content: "This is a test article.",
          fi,
          userId: 1,
        },
      });
    } catch (e) {
      if (afi.isIndexConflictError(e)) {
        // Conflict occurred (processes are executed simultaneously).
        // Regenerate the fractional index and try again.
        continue;
      }

      throw e;
    }
  }
}

// Read (list)
async function list() {
  const articles = await prisma.article.findMany({
    where: {
      userId: 1,
    },
    // To sort by fractional index, just use the `orderBy` property.
    orderBy: {
      fi: "asc",
    },
  });
  return articles;
}

// Update (move)
async function move() {
  // Moves the article 3 to the position after the article 4.

  const indices = await afi.getIndicesAfter({ id: 4 }, { userId: 1 });
  if (!indices) {
    throw new Error("The article 4 does not exist.");
  }

  for (const fi of afi.generateKeyBetween(...indices)) {
    try {
      await prisma.article.update({
        where: {
          id: 3,
        },
        data: {
          fi,
        },
      });
    } catch (e) {
      if (afi.isIndexConflictError(e)) {
        // Conflict occurred (processes are executed simultaneously).
        // Regenerate the fractional index and try again.
        continue;
      }

      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2001"
      ) {
        throw new Error("The article 3 does not exist.");
      }

      throw e;
    }
  }
}

// Delete
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

See the `examples` directory for more examples.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- [Realtime editing of ordered sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by Figma for the idea
- [Implementing Fractional Indexing](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/) by David Greenspan for base implementation
