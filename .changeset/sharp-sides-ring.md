---
"fraci": minor
---

**BREAKING CHANGE**: Changed the parameter order in `defineDrizzleFraci` function.

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
