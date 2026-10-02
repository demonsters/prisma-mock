---
"prisma-mock": patch
---

Lookups by id, unique field, compound key or foreign key (plainly, with `equals` or with `in`) no longer match every row of the table when indexes are disabled, or when the index can't answer them, as for compound keys. That covers `findUnique`, `count`, `upsert`, `connect`, `include` and ordering by a relation: at 3000 rows these went from 65–845ms to 3–27ms without indexes.
