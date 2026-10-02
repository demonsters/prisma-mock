---
"prisma-mock": patch
---

With indexes enabled, lookups by a foreign key now match the table after writes and state changes. A row moved to another value was still returned under its old one, deleting one row dropped the other rows sharing its value from the index, and a rolled back `$transaction`, `$setInternalState` or `$clear` left the index describing the previous data.
