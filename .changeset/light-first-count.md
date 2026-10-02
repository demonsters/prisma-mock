---
"prisma-mock": patch
---

Interactive `$transaction` no longer copies all of the data before running, `findFirst` / `findUnique` without `orderBy`, `skip`, `take`, `cursor` or `distinct` stop at the first matching row, and `count` counts matches without building result rows.
