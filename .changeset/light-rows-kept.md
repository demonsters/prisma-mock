---
"prisma-mock": patch
---

Creating the mock client is faster and it uses less memory. A model's operations are only built the first time one of them runs, instead of for every model when the client is created, and a value of an id or unique field no longer gets a `Set` of its own in the rows looked up by value. A client using three models of the test schema keeps ~70KB instead of ~150KB (~90KB before this release), and the lookups by id and foreign key over 30,000 rows take 1.7MB instead of 6MB. Creating a client no longer copies the data once per model to add the empty tables: with a schema of 165 models and a `mockDeep` client, `createPrismaMock` went from ~2ms to ~0.55ms, and a client keeps ~350KB instead of ~1.1MB.
