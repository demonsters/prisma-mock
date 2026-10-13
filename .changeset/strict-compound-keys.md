---
"prisma-mock": patch
---

A compound key's name (such as `name_ownerId`) in a `where` is now rejected with a `PrismaClientValidationError` everywhere but the top level of a unique `where`, as Prisma does: in `findMany`, `findFirst`, `count`, `aggregate`, `groupBy`, `deleteMany`, `updateMany` and `updateManyAndReturn`, inside `AND`, `OR` and `NOT`, and in relation filters. This can break code that used one there; filter on the key's fields instead, e.g. `{ name, ownerId }`.
