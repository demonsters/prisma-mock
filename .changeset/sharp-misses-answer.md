---
"prisma-mock": patch
---

`equals` and `in` filters on an id, unique field or foreign key, and lookups that find nothing, are answered from the rows holding those values instead of scanning the table: 3000 of each over 3000 rows went from 200–620ms to a few ms. Results come back in table order, and rows pushed straight into the internal state are picked up.
