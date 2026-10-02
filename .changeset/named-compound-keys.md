---
"prisma-mock": patch
---

Support compound `@@unique` and `@@id` keys with a custom `name`. Where clauses (`findUnique`, `update`, `upsert`, `delete`, nested `connect`, …) now use the custom name as the lookup key, like Prisma does: `@@unique([organizationId, userId], name: "orgUser")` is queried with `where: { orgUser: { organizationId, userId } }`.

This also fixes filters such as `{ equals: … }` on a field with a single-field `@@unique([field])`, which never matched before (#132).

Potentially breaking: when a constraint has a custom name, its default key (`organizationId_userId`) no longer matches anything. Prisma rejects that key with a validation error. Also, creating a record with a duplicate composite `@@id` now throws `P2002` like Prisma does. Before, the duplicate was inserted silently.
