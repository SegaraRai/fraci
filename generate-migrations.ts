import { $, env } from "bun";

// Prisma doesn't support in-memory SQLite databases, so we use a random file name.
env["PRISMA_DB_URL"] = `file:temp/${crypto.randomUUID()}.db?mode=memory`;

await $`rm -rf drizzle/migrations`;
await $`bun drizzle-kit generate --name init`;

await $`rm -rf prisma/migrations`;
await $`bun prisma migrate dev --name init`;
await $`bun prisma generate`;
