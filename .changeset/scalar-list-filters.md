---
"prisma-mock": patch
---

Support the scalar list filters `has`, `hasSome`, `hasEvery` and `isEmpty`. Before, they matched every row (#159).

A scalar list field (such as `String[]`) that is left out on create is now an empty list, like Prisma returns it, instead of `null`.
