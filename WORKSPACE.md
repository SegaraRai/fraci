# Workspace Structure

This project uses a pnpm workspace and Vite+ for task orchestration, formatting,
linting, and testing.

## Structure

```text
fractional-indexing/
├── packages/
│   ├── core/                    # Main fraci library
│   └── examples/
│       ├── __centralized__/     # Centralized schemas, tests, and utilities
│       │   ├── schemas/        # Database schemas (schema.drizzle.ts, schema.prisma)
│       │   ├── src/            # Implementation files (server.drizzle.ts, server.prisma.ts)
│       │   ├── test/           # Test files (basic.drizzle.test.ts, basic.prisma.test.ts)
│       │   └── test-utils.ts   # Shared test utilities
│       ├── prisma-v5/          # Prisma v5 integration tests
│       ├── prisma-v6/          # Prisma v6 integration tests
│       ├── prisma-v7/          # Prisma v7 integration tests
│       ├── drizzle-v0-30/      # Drizzle v0.30 integration tests
│       ├── drizzle-v0-40/      # Drizzle v0.39 integration tests
│       ├── drizzle-v0-44/      # Drizzle v0.44 integration tests
│       ├── drizzle-v0-45/      # Drizzle v0.45 integration tests
│       └── drizzle-v1/         # Drizzle v1 release-candidate tests
├── package.json                 # Root workspace configuration
├── pnpm-workspace.yaml          # Workspace and dependency policy
├── vite.config.ts               # Tasks, formatter, and linter configuration
└── WORKSPACE.md                # This file
```

## Package Details

### packages/core

Contains the main fraci library code. This is what gets published to npm.

- All source code (`src/`)
- Vite+ package configuration (`vite.config.ts`)
- Documentation generation (`typedoc.json`)
- Core tests (`test/`)

### packages/examples/**centralized**

Contains shared implementation files and test utilities:

- **schemas/**: Database schema files that work across all versions
  - `schema.drizzle.ts` - Reference Drizzle schema
  - `schema.prisma` - Reference Prisma schema
- **src/**: Implementation files organized by ORM
  - `server.drizzle.ts` - Common Drizzle server utilities (all versions)
  - `server.prisma.ts` - Common Prisma server utilities (all versions)
- **test/**: Test files that work across all versions
  - `basic.drizzle.test.ts` - Reference Drizzle test
  - `basic.prisma.test.ts` - Reference Prisma test
- **test-utils.ts**: Shared test utilities

### packages/examples/\*

Each example package tests fraci with a specific version of Prisma or Drizzle:

- Dedicated package.json with specific dependency versions
- Contains local schema and test files so each compiler resolves the package's own ORM version
- Exercises the same behavior across every supported version

## Tasks

Run from the root directory:

```bash
# Build the core library
vp run build

# Test core library and compatibility packages
vp run test

# Typecheck core library and compatibility packages
vp run typecheck

# Generate documentation
vp run build:docs

# Format and lint
vp run check
```

## Development

1. Install dependencies: `vp install --frozen-lockfile`
2. Build the core library: `vp run build`
3. Run tests: `vp run test`

The workspace uses:

- **pnpm workspaces** for dependency management
- **Vite+** for tasks, formatting, and linting
- **Vite+ Test** as the test and benchmark runner
- **Workspace references** (`workspace:*`) for core library dependencies
- **Version-local fixtures** so TypeScript validates against each installed ORM version

## Testing Strategy

Each example package:

1. Installs a specific version of Prisma/Drizzle
2. References the core fraci library via `workspace:*`
3. Compiles a local schema against that package's installed ORM version
4. Runs the same integration behavior against a real SQLite database
5. Generates Prisma clients before Prisma tests and typechecks

## File Organization

### Naming Conventions

- **Version-local ORM fixtures**: `schema.ts` or `schema.prisma`, plus `basic.test.ts`
- **Shared assertions**: common behavior is kept consistent across fixtures

### Centralization Benefits

- **Correct resolution**: every fixture loads its own ORM dependency
- **Consistency**: identical behavior is asserted across all supported versions
- **Coverage**: stable releases and Drizzle v1 prereleases are tested in CI

This ensures fraci works correctly with Drizzle ORM v0.30 and later v0 releases, Drizzle ORM v1 prereleases, and Prisma ORM v5 through v7.
