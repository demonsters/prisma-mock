---
"prisma-mock": patch
---

`create` and `update` on models with a compound key no longer check every row of the table for a compound key held as a field.
