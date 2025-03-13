---
"fraci": minor
---

**BREAKING CHANGE**: Changed the parameter order in `indicesForAfter` and `indicesForBefore` functions to make it more natural, with the broader grouping context (`where`/`group`) before the more specific cursor (`cursor`).

Before:

```ts
indicesForAfter(cursor, where);
indicesForBefore(cursor, where);
```

After:

```ts
indicesForAfter(where, cursor);
indicesForBefore(where, cursor);
```

This change affects both Drizzle and Prisma implementations.
