---
"prisma-mock": patch
---

Writes no longer slow down with the number of rows that share a foreign key value when indexes are enabled, and `create` / `update` on models with a compound key no longer check every row of the table for a compound key held as a field. Updating a row of a model with a compound id no longer replaces other rows in the index that share part of that id.
