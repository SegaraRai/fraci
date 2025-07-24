---
"fraci": minor
---

**BREAKING CHANGE**: Added support for Prisma client type definitions generated outside of node_modules.

The type definition for `PrismaClient` is no longer imported from `@prisma/client`. As a result, you must provide a type definition when instantiating fraci options or extensions. Please migrate as follows:

```diff
  import { definePrismaFraci, prismaFraci } from "fraci/prisma";
  import { PrismaClient } from "./path/to/your/prisma/client.js"; // Adjust the import path to your Prisma client

  const baseClient = new PrismaClient();

- const definition = definePrismaFraci({
+ const definition = definePrismaFraci(baseClient, {  // or you can use `PrismaClient` instead of `baseClient`
    // your options here
  });

  const client = baseClient.$extends(
-   prismaFraci(definition),
+   prismaFraci(baseClient, definition),  // or you can use `PrismaClient` instead of `baseClient`
  );
```

Along with this, the `PrismaClient` type argument was added first to the following related public type definitions:

- `prismaFraci`
- `definePrismaFraci`
- `FraciForPrisma`
- `PrismaFraciExtension`
- `PrismaFraciFieldOptionsRecord`
- `PrismaFraciOptions`

Furthermore, we are anticipating future changes to Prisma's architecture and reducing imports from `@prisma/client`. As a result, the `PrismaClientConflictError` type no longer inherits from `PrismaClientKnownRequestError`.
