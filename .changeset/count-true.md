---
"prisma-mock": patch
---

`groupBy` and `aggregate` with `_count: true` return the number of rows as `_count`. Before, `groupBy` left `_count` out and `aggregate` returned an empty object (#160).

The count of a field in `aggregate` (`_count: { field: true }`) now leaves out the rows where the field is `null`, like Prisma and `groupBy` do.
