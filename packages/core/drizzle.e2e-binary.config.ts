import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migrations.e2e-binary",
  schema: "./drizzle/schema.e2e-binary.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: ":memory:",
  },
});
