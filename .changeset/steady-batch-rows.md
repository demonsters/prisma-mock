---
"prisma-mock": patch
---

`createMany` copies the table once per batch instead of once per row, so seeding large fixtures no longer slows down quadratically: 30,000 rows went from ~1.3s to 50–135ms.
