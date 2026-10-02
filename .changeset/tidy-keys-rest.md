---
"prisma-mock": patch
---

Resolve a model's compound `@@id` / `@@unique` keys once per query again, instead of for every row a `where` clause is matched against.
