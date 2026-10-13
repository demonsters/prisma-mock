---
"prisma-mock": patch
---

`update` no longer slows down as a table grows. A unique `where` now looks up the row it points at instead of matching every row, and the updated row is picked by position instead of being searched for with all of its fields as the filter: 3000 updates in a loop went from 1.3s to ~12ms.
