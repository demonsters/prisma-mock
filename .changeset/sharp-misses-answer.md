---
"prisma-mock": patch
---

With indexes enabled, `equals` and `in` filters on an indexed field, and lookups that find nothing, are answered from the index instead of scanning the table: 3000 of each over 3000 rows went from 200–620ms to 1–2ms. Results come back in table order, and rows pushed straight into the internal state are picked up.
