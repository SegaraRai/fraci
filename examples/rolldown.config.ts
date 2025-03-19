import * as esbuild from "esbuild";
import { gzipSync } from "node:zlib";
import { defineConfig, type RolldownOptions } from "rolldown";

function dumpSize(size: number): string {
  return `${String(size).padStart(5)}B (${(size / 1024)
    .toFixed(2)
    .padStart(5)} KiB)`;
}

const aggregated: Record<
  string,
  { raw: number; minified: number; gzipped: number }
> = {};

process.on("exit", () => {
  const toKiB = (size: number) => (size / 1024).toFixed(2);

  console.log("Bundle sizes:");
  console.log(
    "| Integration              | Total Size (minified)     | Total Size (minified + gzipped) |",
  );
  console.log(
    "| ------------------------ | ------------------------- | ------------------------------- |",
  );

  for (const [integration, integrationId] of [
    ["Core only", "core"],
    ["Drizzle ORM", "drizzle"],
    ["Prisma ORM", "prisma"],
  ]) {
    for (const [variant, variantId] of [
      ["Binary", "binary"],
      ["String", "string"],
      ["Both", "all"],
    ]) {
      const sizes = aggregated[`${integrationId}.${variantId}`];
      if (!sizes) {
        continue;
      }

      if (integrationId === "core") {
        console.log(
          `| **${integration} (${variant})** | ${toKiB(sizes.minified)} KiB | **${toKiB(sizes.gzipped)} KiB** |`,
        );
      } else {
        const coreSize = aggregated[`core.${variantId}`];
        const minifiedDiff = sizes.minified - coreSize.minified;
        const gzippedDiff = sizes.gzipped - coreSize.gzipped;

        console.log(
          `| **${integration} (${variant})** | ${toKiB(sizes.minified)} KiB (Core +${toKiB(minifiedDiff)} KiB) | **${toKiB(sizes.gzipped)} KiB** (Core +${toKiB(gzippedDiff)} KiB) |`,
        );
      }
    }
  }
});

export default defineConfig(
  [
    ["core-only/entrypoint.all", "core.all"],
    ["core-only/entrypoint.binary", "core.binary"],
    ["core-only/server.string", "core.string"],
    ["drizzle-orm/entrypoint.all", "drizzle.all"],
    ["drizzle-orm/server.binary", "drizzle.binary"],
    ["drizzle-orm/server.string", "drizzle.string"],
    ["drizzle-orm-sync/entrypoint.all", "drizzle.all"],
    ["drizzle-orm-sync/server.binary", "drizzle.binary"],
    ["drizzle-orm-sync/server.string", "drizzle.string"],
    ["prisma/server.binary", "prisma.all"],
    ["prisma/server.string", "prisma.all"],
  ].map(
    ([entrypoint, id]): RolldownOptions => ({
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

            const rawSize = fraciBundle.code.length;
            const minifiedSize = minified.code.length;
            const gzippedSize = gzipped.length;

            console.log(
              `Fraci size for ${entrypoint.padEnd(32)}: raw: ${dumpSize(
                rawSize,
              )}, minified: ${dumpSize(
                minifiedSize,
              )}, minified + gzipped: ${dumpSize(gzippedSize)}`,
            );

            if ((aggregated[id]?.minified ?? 0) < minifiedSize) {
              aggregated[id] = {
                raw: rawSize,
                minified: minifiedSize,
                gzipped: gzippedSize,
              };
            }
          },
        },
      ],
    }),
  ),
);
