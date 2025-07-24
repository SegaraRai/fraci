# Workspace Structure

This project has been converted to a bun workspace to support comprehensive integration testing with different versions of Prisma and Drizzle ORM.

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
│       ├── prisma-v5/          # Prisma v5 integration tests (symlinked files)
│       ├── prisma-v6/          # Prisma v6 integration tests (symlinked files)
│       ├── drizzle-v0-30/      # Drizzle v0.30 integration tests (symlinked files)
│       ├── drizzle-v0-40/      # Drizzle v0.40 integration tests (symlinked files)
│       └── drizzle-v0-44/      # Drizzle v0.44 integration tests (symlinked files)
├── package.json                 # Root workspace configuration
└── WORKSPACE.md                # This file
```

## Package Details

### packages/core

Contains the main fraci library code. This is what gets published to npm.

- All source code (`src/`)
- Build configuration (`tsup.config.ts`)
- Documentation generation (`typedoc.json`)
- Core tests (`test/`)

### packages/examples/**centralized**

Contains all implementation files, tests, and schemas that are shared via symlinks:

- **schemas/**: Database schema files that work across all versions
  - `schema.drizzle.ts` - Universal Drizzle schema (works with v0.30-v0.44)
  - `schema.prisma` - Universal Prisma schema (works with v5-v6)
- **src/**: Implementation files organized by ORM
  - `server.drizzle.ts` - Common Drizzle server utilities (all versions)
  - `server.prisma.ts` - Common Prisma server utilities (all versions)
- **test/**: Test files that work across all versions
  - `basic.drizzle.test.ts` - Universal Drizzle test (works with v0.30-v0.44)
  - `basic.prisma.test.ts` - Universal Prisma test (works with v5-v6)
- **test-utils.ts**: Shared test utilities

### packages/examples/\*

Each example package tests fraci with a specific version of Prisma or Drizzle:

- Dedicated package.json with specific dependency versions
- All files are symlinked from `__centralized__` (no version-specific code needed)
- Uses the same schema, test, and implementation files across all versions

## Scripts

Run from the root directory:

```bash
# Build the core library
bun run build

# Test core library only
bun run test

# Test all packages (core + examples)
bun run test:all

# Typecheck core library only
bun run typecheck

# Typecheck all packages
bun run typecheck:all

# Generate documentation
bun run build-docs
```

## Development

1. Install dependencies: `bun install --linker=isolated`
2. Build core library: `bun run build`
3. Run tests: `bun run test:all`

The workspace uses:

- **bun workspaces** for dependency management
- **Symbolic links** for sharing implementation files, tests, and schemas
- **Workspace references** (`workspace:*`) for core library dependencies
- **Universal compatibility** - single files work across all supported versions

## Testing Strategy

Each example package:

1. Installs a specific version of Prisma/Drizzle
2. References the core fraci library via `workspace:*`
3. Uses universal test files via symlinks from `__centralized__`
4. Uses universal schema files via symlinks from `__centralized__`
5. Uses shared utilities via symlinks to `__centralized__/test-utils.ts`

## File Organization

### Naming Conventions

- **Universal ORM support**: `schema.drizzle.ts`, `basic.prisma.test.ts`
- **No version-specific files needed** - all files work across supported versions

### Centralization Benefits

- **Maximum DRY**: Single file works across all versions
- **Zero Duplication**: No version-specific code or tests needed
- **Consistency**: Identical behavior across all versions
- **Maintainability**: Single point of updates for all versions
- **Simplicity**: Easy to understand and maintain

This ensures fraci works correctly across all supported versions of both ORMs with absolute minimal code duplication - each file supports all versions through universal compatibility.
