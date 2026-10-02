---
"prisma-mock": minor
---

Fix exponential cost of nested relation filters in `where` clauses. The part of a relation filter that does not depend on the row being matched is now evaluated once per query instead of once per candidate row, and existence checks (`some` / `none`) stop at the first match. A six level deep filter over 34 rows went from ~16s to under 1ms.
