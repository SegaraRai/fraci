import { defineConfig } from "vite-plus";

const prismaGenerateCommands = [
  "vp exec --filter fraci -- prisma generate",
  "vp exec --filter @fraci/example-prisma-v5 -- prisma generate",
  "vp exec --filter @fraci/example-prisma-v6 -- prisma generate",
  "vp exec --filter @fraci/example-prisma-v7 -- prisma generate",
];

const fixtureTypecheckCommands = [
  "vp exec --filter @fraci/example-drizzle-v0-30 -- tsc --noEmit",
  "vp exec --filter @fraci/example-drizzle-v0-40 -- tsc --noEmit",
  "vp exec --filter @fraci/example-drizzle-v0-44 -- tsc --noEmit",
  "vp exec --filter @fraci/example-drizzle-v0-45 -- tsc --noEmit",
  "vp exec --filter @fraci/example-drizzle-v1 -- tsc --noEmit",
  "vp exec --filter @fraci/example-prisma-v5 -- tsc --noEmit",
  "vp exec --filter @fraci/example-prisma-v6 -- tsc --noEmit",
  "vp exec --filter @fraci/example-prisma-v7 -- tsc --noEmit",
];

const fixtureTestCommands = [
  "vp exec --filter @fraci/example-drizzle-v0-30 -- bun test",
  "vp exec --filter @fraci/example-drizzle-v0-40 -- bun test",
  "vp exec --filter @fraci/example-drizzle-v0-44 -- bun test",
  "vp exec --filter @fraci/example-drizzle-v0-45 -- bun test",
  "vp exec --filter @fraci/example-drizzle-v1 -- bun test",
  "vp exec --filter @fraci/example-prisma-v5 -- bun test",
  "vp exec --filter @fraci/example-prisma-v6 -- bun test",
  "vp exec --filter @fraci/example-prisma-v7 -- tsx --test test/basic.test.ts",
];

export default defineConfig({
  lint: {
    options: {
      typeAware: false,
      typeCheck: false,
    },
    rules: {
      "no-constant-binary-expression": "off",
      "no-empty-file": "off",
      "no-unassigned-vars": "off",
      "no-unused-vars": "off",
    },
    ignorePatterns: [
      "**/dist/**",
      "**/examples-bundled/**",
      "**/prisma/client/**",
      "**/typedoc/**",
    ],
  },
  fmt: {
    endOfLine: "lf",
    printWidth: 80,
    sortPackageJson: true,
    ignorePatterns: [
      "**/dist/**",
      "**/examples-bundled/**",
      "**/migrations/**",
      "**/prisma/client/**",
      "**/public/llms*.txt",
      "**/typedoc/**",
      "pnpm-lock.yaml",
    ],
  },
  run: {
    tasks: {
      generate: {
        command: prismaGenerateCommands,
        cache: false,
      },
      build: {
        command: [
          "vp exec --filter fraci -- node -e \"require('node:fs').rmSync('dist', { recursive: true, force: true })\"",
          "vp exec --filter fraci -- tsup",
        ],
        dependsOn: ["generate"],
      },
      check: {
        command: "vp check",
        dependsOn: ["generate"],
        cache: false,
      },
      typecheck: {
        command: [
          "vp exec --filter fraci -- tsc --noEmit",
          ...fixtureTypecheckCommands,
        ],
        dependsOn: ["generate"],
        cache: false,
      },
      test: {
        command: ["vp exec --filter fraci -- bun test", ...fixtureTestCommands],
        dependsOn: ["build"],
        cache: false,
      },
      bench: {
        command: [
          "vp exec --filter fraci -- bun src/lib/fractional-indexing-string.bench.ts",
          "vp exec --filter fraci -- bun src/lib/fractional-indexing-binary.bench.ts",
        ],
        cache: false,
      },
      attw: {
        command: "vp exec --filter fraci -- attw --profile node16 --pack",
        dependsOn: ["build"],
        cache: false,
      },
      "build:docs": {
        command: [
          "vp exec --filter fraci -- typedoc",
          "vp exec --filter fraci -- bun scripts/copy-assets.ts",
        ],
        dependsOn: ["build"],
      },
      "build:examples": {
        command:
          "vp exec --filter fraci -- rolldown -c examples/rolldown.config.ts",
        dependsOn: ["build"],
      },
      "generate:migrations": {
        command: "vp exec --filter fraci -- bun scripts/generate-migrations.ts",
        cache: false,
      },
      format: {
        command: "vp fmt .",
        cache: false,
      },
      lint: {
        command: "vp lint",
        cache: false,
      },
      "changeset:version": {
        command: "vp exec changeset version",
        cache: false,
      },
      "changeset:publish": {
        command: "vp exec changeset publish",
        cache: false,
      },
    },
  },
});
