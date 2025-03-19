import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { defineConfig, type RolldownOptions } from "rolldown";

function dumpSize(size: number): string {
  return `${String(size).padStart(5)}B (${(size / 1024)
    .toFixed(2)
    .padStart(5)} KiB)`;
}

export default defineConfig(
  [
    "core-only/entrypoint.all",
    "core-only/entrypoint.binary",
    "core-only/server.string",
    "drizzle-orm/entrypoint.all",
    "drizzle-orm/server.binary",
    "drizzle-orm/server.string",
    "drizzle-orm-sync/entrypoint.all",
    "drizzle-orm-sync/server.binary",
    "drizzle-orm-sync/server.string",
    "prisma/server.binary",
    "prisma/server.string",
  ].map(
    (entrypoint): RolldownOptions => ({
      input: `examples/${entrypoint}.ts`,
      external: [
        "bun",
        /^bun:/,
        /^node:/,
        /^drizzle-orm/,
        /^@prisma/,
        /^@?hono/,
        /^zod/,
      ],
      treeshake: true,
      output: {
        dir: `examples-bundled/${entrypoint.replace(/\W+/g, "-")}`,
        chunkFileNames: "[name].js",
        advancedChunks: {
          minSize: 0,
          maxSize: 1024 * 1024 * 1024,
          maxModuleSize: 1024 * 1024 * 1024,
          minModuleSize: 0,
          groups: [
            {
              name: "vendor",
              test: /node_modules|rolldown:/,
              priority: 300,
            },
            {
              name: "fraci",
              test: /dist/,
              priority: 200,
            },
            {
              name: "others",
              priority: 100,
            },
          ],
        },
      },
      plugins: [
        {
          name: "show-size",
          async generateBundle(_options, bundle) {
            this.emitFile({
              fileName: `__${entrypoint.replace(/\W+/g, "_")}__`,
              type: "asset",
              source: "",
            });

            const fraciBundle = bundle["fraci.js"];
            if (fraciBundle?.type !== "chunk") {
              return;
            }

            const minified = await esbuild.transform(fraciBundle.code, {
              minify: true,
              target: "esnext",
            });
            this.emitFile({
              fileName: "fraci.min.js",
              type: "asset",
              source: minified.code,
            });

            const gzipped = gzipSync(minified.code, {
              level: 9,
            });
            this.emitFile({
              fileName: "fraci.min.js.gz",
              type: "asset",
              source: gzipped as unknown as Uint8Array,
            });

            console.log(
              `Fraci size for ${entrypoint.padEnd(32)}: raw: ${dumpSize(
                fraciBundle.code.length,
              )}, minified: ${dumpSize(
                minified.code.length,
              )}, minified + gzipped: ${dumpSize(gzipped.length)}`,
            );
          },
        },
      ],
    }),
  ),
);
