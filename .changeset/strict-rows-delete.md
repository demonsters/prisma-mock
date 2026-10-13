---
"prisma-mock": patch
---

`delete` now rejects a `where` without an `@id`, `@unique` or compound key with a `PrismaClientValidationError`, as Prisma does, instead of deleting every matching row and returning the first. Filters next to a unique key still work. This can break code that relied on the old behaviour, for example `delete({ where: { ownerId } })` to remove all of an owner's rows; use `deleteMany` for that.
