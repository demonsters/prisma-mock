---
"prisma-mock": patch
---

Nested `delete`, `deleteMany`, `updateMany` and `update` (in its array form) on an existing row now only reach the rows related to it, as Prisma does. A nested `delete` of a row that isn't related refuses with P2017 on a list and P2025 on a to-one relation, and a nested `delete` on a list rejects a `where` that isn't unique. `delete: true` on a to-one relation deleted every row of the related table and now deletes only the related one, clearing the foreign key this row holds. An operation that fails now leaves the data as it was, its nested writes included. This can break code that relied on nested writes reaching unrelated rows.
