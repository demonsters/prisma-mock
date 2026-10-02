---
"prisma-mock": patch
---

Nested `update`, `upsert` and `delete` on a to-many relation now resolve a compound key in their `where` against the related model. They used the parent model, so the key never matched: the update and delete threw "not found", and the upsert created a duplicate instead of updating.
