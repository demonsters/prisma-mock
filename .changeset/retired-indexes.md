---
"prisma-mock": minor
---

The `enableIndexes` option is deprecated and no longer has any effect. Lookups by id, unique field, compound key or foreign key are now always answered from the rows holding the value, which also covers compound keys and needs nothing kept in step after `$transaction` rollbacks, `$setInternalState` or `$clear`. This removes the index's known problems: rows found under a foreign key value they had been moved away from, rows sharing a value with a deleted one disappearing from lookups, and a rolled back `$transaction`, `$setInternalState` or `$clear` leaving lookups answering from the previous data.
