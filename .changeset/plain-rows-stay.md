---
"prisma-mock": patch
---

`create` now returns the row it created for models without an `@id` and for a single field `@@id`, where it used to return the first row of the table. With indexes enabled, a `select` or `include` on `create` no longer changes what later queries on that row return.
