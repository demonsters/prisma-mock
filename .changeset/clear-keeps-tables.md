---
"prisma-mock": patch
---

`$clear()` keeps the empty table of every model that has no initial data. Before, `$clear()` restored the data without those tables, so `updateMany` and `deleteMany` on a model with no rows threw `TypeError: Cannot read properties of undefined` instead of returning `{ count: 0 }` (#157).
