---
"prisma-mock": patch
---

`findUnique`, `findUniqueOrThrow`, `update` and `upsert` now reject a `where` without an `@id`, `@unique` or compound key with a `PrismaClientValidationError`, as Prisma does. Before, `findUnique` returned the first matching row, and `update` and `upsert` updated every matching row and returned the last. This can break code that relied on that, for example `update({ where: { ownerId } })` to change all of an owner's rows; use `updateMany` or `findFirst` for those.
