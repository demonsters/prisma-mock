---
"prisma-mock": patch
---

`delete` and `deleteMany` with a unique `where` no longer match every row of the table: deleting 3000 rows one by one went from 155–264ms to ~10ms.
