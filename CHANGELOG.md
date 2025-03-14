# fraci

## 0.12.0

### Minor Changes

- 6451d6a: **BREAKING CHANGE**: Renamed base constants for better consistency and clarity:

  - `BASE16` -> `BASE16L` (lowercase hex digits)
  - `BASE26` -> `BASE26L` (lowercase alphabets)
  - `BASE36` -> `BASE36L` (lowercase alphanumeric)
  - `BASE64` -> `BASE64URL` (URL-safe Base64 characters)

  Added new complementary constants:

  - `BASE16U` (uppercase hex digits)

  The naming convention now uses `L` suffix for lowercase and `U` suffix for uppercase variants.

- 1ba4bab: **BREAKING CHANGE**: Renamed Prisma integration function and type for better consistency with other database integrations:

  - `fraciExtension` -> `prismaFraci` - The main function for creating Prisma extensions
  - `FraciExtensionOptions` ->`PrismaFraciOptions` - The options interface for configuration

  Migration: Replace all instances of `fraciExtension` with `prismaFraci` and update type references from `FraciExtensionOptions` to `PrismaFraciOptions`.

## 0.11.0

### Minor Changes

- 509d84a: **BREAKING CHANGE**: Renamed `DrizzleFraciFetcher(Sync)` type to `FraciForDrizzle(Sync)`.
- 54e65e5: **BREAKING CHANGE**: Changed the parameter order in `indicesForAfter` and `indicesForBefore` functions to make it more natural, with the broader grouping context (`where`/`group`) before the more specific cursor (`cursor`).

  Before:

  ```typescript
  indicesForAfter(cursor, where);
  indicesForBefore(cursor, where);
  ```

  After:

  ```typescript
  indicesForAfter(where, cursor);
  indicesForBefore(where, cursor);
  ```

  This change affects both Drizzle and Prisma implementations.

- 8f28a82: **BREAKING CHANGE**: Changed the parameter order in `defineDrizzleFraci` function.

  The order of the `group` and `cursor` parameters has been swapped to make the API more intuitive. The new order is:

  ```typescript
  defineDrizzleFraci(
    fraci, // Fractional index instance
    table, // Table
    column, // Fractional index column
    group, // Group (columns that define the grouping context)
    cursor // Cursor (columns that uniquely identify a row within a group)
  );
  ```

- edb941e: Add fraci methods to Drizzle ORM helper.

## 0.10.0

### Minor Changes

- ec3cddd: Add `skip` parameter to `generateKeyBetween` and `generateNKeysBetween` methods.

## 0.9.0

### Minor Changes

- e7e7a0a: Support Drizzle ORM integration.

## 0.8.0

### Minor Changes

- 5f3cec8: Do not use unique symbol to brand `FractionalIndex` to avoid TS4058 error.

## 0.7.0

### Minor Changes

- 1430862: Mark package side-effect free.

## 0.6.0

### Minor Changes

- 93c538b: Do not use unique symbol to brand prisma types to avoid TS4058 error.
- 082ff42: Remove `__EXAMPLE__` type only hint.
- 367b8d6: Add caching feature.

## 0.5.0

### Minor Changes

- d46c49a: **BREAKING CHANGE** Renamed methods and types.
- c0a5d80: Support transaction.

### Patch Changes

- 3c91aed: Changed default max retry count to 5 (from 10).

## 0.4.1

### Patch Changes

- 8eb6ae7: Updated package description.

## 0.4.0

### Minor Changes

- 364b106: **BREAKING CHANGE:** Removed result extension.

## 0.3.0

### Minor Changes

- d193157: Add `isIndexConflictError` method.

## 0.2.0

### Minor Changes

- ff8627c: Automate release.
