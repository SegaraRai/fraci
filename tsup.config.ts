import { defineConfig } from "tsup";

export default defineConfig(
  (["DEV", "PROD"] as const).map((mode) => ({
    outDir: mode === "DEV" ? "dist/dev" : "dist",
    entry: ["src/index.ts", "src/drizzle.ts", "src/prisma.ts"],
    format: ["cjs", "esm"],
    external: ["drizzle-orm", "@prisma/client"],
    dts: true,
    sourcemap: true,
    clean: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    define: {
      "globalThis.__DEV__": JSON.stringify(mode === "DEV"),
    },
  })),
);
