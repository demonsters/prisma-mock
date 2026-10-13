---
"prisma-mock": patch
---

The mock client uses less memory. A model's operations are only built the first time one of them runs, instead of for every model when the client is created, and a value of an id or unique field no longer gets a `Set` of its own in the rows looked up by value. A client using three models of the test schema keeps ~70KB instead of ~150KB (~90KB before this release), and the lookups by id and foreign key over 30,000 rows take 1.7MB instead of 6MB.
