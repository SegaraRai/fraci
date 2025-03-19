# fraci

## 0.15.0

### Minor Changes

- 9bc7f1d: Implementated Binary Fractional Indexing.

  Added support for binary-based fractional indices using `Uint8Array` for more efficient storage and operations. This implementation provides:

  - Improved performance with optimized binary operations for generating and comparing indices
  - Enhanced memory efficiency for applications handling large numbers of indices
  - Specialized factory functions for creating binary or string-based indices

  New Features:

  - Added `fraciBinary` and `fraciString` factory functions for creating specialized fractional indexing utilities
  - Added `base` and `brand` properties to `Fraci` for better type safety and runtime information
  - Enhanced validation and error handling for binary fractional indices

  Breaking Changes:

  - **Template Parameter Signature**: Changed template parameter signature for `fraci`, `Fraci`, and `FractionalIndex` types
  - **Removed Properties**: Removed `digitBase` and `lengthBase` properties from `Fraci`

  Added comprehensive type system with clear separation between binary and string-based indices:

  - `AnyFractionalIndex`, `AnyBinaryFractionalIndex`, `AnyStringFractionalIndex`
  - `AnyFractionalIndexBase`, `AnyBinaryFractionalIndexBase`, `AnyStringFractionalIndexBase`
  - `AnyFraci`, `AnyBinaryFraci`, `AnyStringFraci`
  - `FraciOptionsBase`, `BinaryFraciOptions`, `StringFraciOptions`

## 0.14.0

### Minor Changes

- 294fb62: Added `FraciForPrisma` type.
- da64bc1: Added `definePrismaFraci` function. Added `PrismaFraciExtension` type export.

### Patch Changes

- 3c273e3: Reduced Prisma ORM integration code size.

## 0.13.0

### Minor Changes

- b0c4151: Enhanced error handling:

  - Added "Fraci" prefix to error messages to make it easier to identify the source of the error
  - Added comprehensive "Runtime Errors" section to the documentation with detailed information about each error message
  - Provided clear causes and solutions for each error message to improve troubleshooting experience

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
    cursor, // Cursor (columns that uniquely identify a row within a group)
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
