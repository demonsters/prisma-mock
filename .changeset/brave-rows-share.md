---
"prisma-mock": patch
---

`updateMany` and `deleteMany` now build their `where` matcher once instead of once per row, so the related rows a relation filter needs are evaluated once per query, as `findMany` and `update` already did.
