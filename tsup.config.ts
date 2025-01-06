import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/prisma.ts"],
  format: ["cjs", "esm"],
  external: ["@prisma/client"],
  dts: true,
  sourcemap: true,
  clean: true,
  minifyIdentifiers: true,
  minifySyntax: true,
});
