---
"fraci": minor
---

**BREAKING CHANGE**: Renamed Prisma integration function and type for better consistency with other database integrations:

- `fraciExtension` -> `prismaFraci` - The main function for creating Prisma extensions
- `FraciExtensionOptions` ->`PrismaFraciOptions` - The options interface for configuration

Migration: Replace all instances of `fraciExtension` with `prismaFraci` and update type references from `FraciExtensionOptions` to `PrismaFraciOptions`.
