---
"prisma-mock": patch
---

`create` and `createMany` no longer slow down quadratically as a table grows. Duplicate checks for `@id`, `@unique` and compound keys look the value up instead of scanning the table, and models with a compound key no longer rebuild every row on each write. Creating 3000 rows went from 0.6–2.1s to under 50ms.
