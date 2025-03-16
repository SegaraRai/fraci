import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { defineConfig, type RolldownOptions } from "rolldown";

function dumpSize(size: number): string {
  return `${size}B (${(size / 1024).toFixed(2)} KiB)`;
}

export default defineConfig(
  ["core-only", "drizzle-orm", "drizzle-orm-sync", "prisma"].map(
    (entrypoint): RolldownOptions => ({
      input: `examples/${entrypoint}/server.ts`,
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
        dir: `examples-bundled/${entrypoint}`,
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
              priority: 10,
            },
          ],
        },
      },
      plugins: [
        {
          name: "show-size",
          async generateBundle(_options, bundle) {
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
              `Fraci size for ${entrypoint}: raw: ${dumpSize(
                fraciBundle.code.length
              )}, minified: ${dumpSize(
                minified.code.length
              )}, minified + gzipped: ${dumpSize(gzipped.length)}`
            );
          },
        },
      ],
    })
  )
);
