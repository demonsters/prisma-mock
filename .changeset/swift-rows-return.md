---
"prisma-mock": patch
---

`updateMany` and `updateManyAndReturn` no longer slow down quadratically with the number of rows they change. The changed rows are now picked by position instead of being read back with one `where` clause per row: updating 3000 rows went from ~590ms to ~3ms.
