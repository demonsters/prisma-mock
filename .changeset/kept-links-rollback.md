---
"prisma-mock": patch
---

A failed operation or `$transaction` now also undoes the many-to-many links it added, instead of leaving them connected while the rest of its writes were rolled back.
