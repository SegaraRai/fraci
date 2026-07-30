import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migrations.e2e-string",
  schema: "./drizzle/schema.e2e-string.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: ":memory:",
  },
});
