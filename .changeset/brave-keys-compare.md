---
"fraci": minor
---

**BREAKING CHANGE:** Published output now targets ES2022 and requires Node.js
22.13 or newer and TypeScript 5.7 or newer. Invalid numeric options and
generation arguments that were previously accepted now throw a `FraciError`
with the `INVALID_ARGUMENT` code.

Also add lower-bound ORM and TypeScript compatibility coverage and allow Prisma
transaction clients in ordering helpers.
