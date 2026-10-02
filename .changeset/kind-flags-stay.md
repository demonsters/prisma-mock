---
"prisma-mock": patch
---

Options left out of the options object now fall back to their defaults. Passing any options used to drop all of them, so `enableIndexes` (documented as `true`) was off, and `datamodel` was missing, as soon as an options object was passed. Options set to `undefined` also get their default.
