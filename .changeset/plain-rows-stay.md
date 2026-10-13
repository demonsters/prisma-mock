---
"prisma-mock": patch
---

`create` now returns the row it created for models without an `@id` and for a single field `@@id`, where it used to return the first row of the table.
