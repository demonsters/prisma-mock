---
"prisma-mock": patch
---

Options left out of the options object now fall back to their defaults. Passing any options used to drop all of them, so `createPrismaMock(Prisma, { data })` crashed on the missing `datamodel`. Options set to `undefined` also get their default.
