import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    clean: true,
    deps: {
      neverBundle: ["@prisma/client", "drizzle-orm"],
    },
    dts: true,
    entry: {
      drizzle: "src/drizzle.ts",
      index: "src/index.ts",
      prisma: "src/prisma.ts",
    },
    fixedExtension: false,
    format: ["esm", "cjs"],
    minify: true,
    plugins: [
      {
        name: "fraci-build-mode",
        tsdownConfig(config, inlineConfig) {
          config.define = {
            "globalThis.__DEV__":
              inlineConfig.outDir === "dist/dev" ? "true" : "false",
          };
        },
      },
    ],
    sourcemap: true,
    target: "es2022",
  },
});
