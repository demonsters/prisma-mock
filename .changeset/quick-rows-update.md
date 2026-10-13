---
"prisma-mock": patch
---

`updateMany` and `updateManyAndReturn` with a `where` on an id, unique field, foreign key or compound key no longer match every row of the table: 500 calls filtering on a foreign key over 5000 rows went from ~360ms to ~20ms.
