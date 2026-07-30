import { $, env } from "bun";
import { webcrypto as crypto } from "node:crypto";

// Prisma doesn't support in-memory SQLite databases, so we use a random file name.
env["PRISMA_DB_URL"] = `file:temp/${crypto.randomUUID()}.db?mode=memory`;

await $`rm -rf drizzle/migrations`;
await $`bun drizzle-kit generate --config=drizzle.config.ts --name init`;

await $`rm -rf drizzle/migrations.e2e-binary`;
await $`bun drizzle-kit generate --config=drizzle.e2e-binary.config.ts --name init`;

await $`rm -rf drizzle/migrations.e2e-string`;
await $`bun drizzle-kit generate --config=drizzle.e2e-string.config.ts --name init`;

await $`rm -rf prisma/migrations`;
await $`bun prisma migrate dev --name init`;
await $`bun prisma generate`;
