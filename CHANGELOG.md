# prisma-mock

## 1.2.0-alpha.3

### Patch Changes

- f3529e6: Creating the mock client is faster and it uses less memory. A model's operations are only built the first time one of them runs, instead of for every model when the client is created, and a value of an id or unique field no longer gets a `Set` of its own in the rows looked up by value. A client using three models of the test schema keeps ~70KB instead of ~150KB (~90KB before this release), and the lookups by id and foreign key over 30,000 rows take 1.7MB instead of 6MB. Creating a client no longer copies the data once per model to add the empty tables: with a schema of 165 models and a `mockDeep` client, `createPrismaMock` went from ~2ms to ~0.55ms, and a client keeps ~350KB instead of ~1.1MB.

## 1.2.0-alpha.2

### Minor Changes

- 13deb5b: The `enableIndexes` option is deprecated and no longer has any effect. Lookups by id, unique field, compound key or foreign key are now always answered from the rows holding the value, which also covers compound keys and needs nothing kept in step after `$transaction` rollbacks, `$setInternalState` or `$clear`. This removes the index's known problems: rows found under a foreign key value they had been moved away from, rows sharing a value with a deleted one disappearing from lookups, and a rolled back `$transaction`, `$setInternalState` or `$clear` leaving lookups answering from the previous data.

### Patch Changes

- 841d77e: `updateMany` and `deleteMany` now build their `where` matcher once instead of once per row, so the related rows a relation filter needs are evaluated once per query, as `findMany` and `update` already did.
- d5a2749: Lookups by id, unique field, compound key or foreign key (plainly, with `equals` or with `in`) no longer match every row of the table. That covers `findUnique`, `count`, `upsert`, `connect`, `include` and ordering by a relation: at 3000 rows these went from 65–845ms to 3–27ms.
- 6e26bde: `update` no longer slows down as a table grows. A unique `where` now looks up the row it points at instead of matching every row, and the updated row is picked by position instead of being searched for with all of its fields as the filter: 3000 updates in a loop went from 1.3s to ~12ms.
- 7fdd67f: A failed operation or `$transaction` now also undoes the many-to-many links it added, instead of leaving them connected while the rest of its writes were rolled back.
- 13deb5b: Options left out of the options object now fall back to their defaults. Passing any options used to drop all of them, so `createPrismaMock(Prisma, { data })` crashed on the missing `datamodel`. Options set to `undefined` also get their default.
- 5a1756b: Interactive `$transaction` no longer copies all of the data before running, `findFirst` / `findUnique` without `orderBy`, `skip`, `take`, `cursor` or `distinct` stop at the first matching row, and `count` counts matches without building result rows.
- c1b7585: `create` now returns the row it created for models without an `@id` and for a single field `@@id`, where it used to return the first row of the table.
- 9bde414: `delete` and `deleteMany` with a unique `where` no longer match every row of the table: deleting 3000 rows one by one went from 155–264ms to ~10ms.
- dc5c79e: `updateMany` and `updateManyAndReturn` with a `where` on an id, unique field, foreign key or compound key no longer match every row of the table: 500 calls filtering on a foreign key over 5000 rows went from ~360ms to ~20ms.
- 79b057e: `create` and `createMany` no longer slow down quadratically as a table grows. Duplicate checks for `@id`, `@unique` and compound keys look the value up instead of scanning the table, and models with a compound key no longer rebuild every row on each write. Creating 3000 rows went from 0.6–2.1s to under 50ms.
- c8bf806: Nested `delete`, `deleteMany`, `updateMany` and `update` (in its array form) on an existing row now only reach the rows related to it, as Prisma does. A nested `delete` of a row that isn't related refuses with P2017 on a list and P2025 on a to-one relation, and a nested `delete` on a list rejects a `where` that isn't unique. `delete: true` on a to-one relation deleted every row of the related table and now deletes only the related one, clearing the foreign key this row holds. An operation that fails now leaves the data as it was, its nested writes included. This can break code that relied on nested writes reaching unrelated rows.
- 2c80bd8: `equals` and `in` filters on an id, unique field or foreign key, and lookups that find nothing, are answered from the rows holding those values instead of scanning the table: 3000 of each over 3000 rows went from 200–620ms to a few ms. Results come back in table order, and rows pushed straight into the internal state are picked up.
- d02db1d: `createMany` copies the table once per batch instead of once per row, so seeding large fixtures no longer slows down quadratically: 30,000 rows went from ~1.3s to 50–135ms.
- 91dbf9c: A compound key's name (such as `name_ownerId`) in a `where` is now rejected with a `PrismaClientValidationError` everywhere but the top level of a unique `where`, as Prisma does: in `findMany`, `findFirst`, `count`, `aggregate`, `groupBy`, `deleteMany`, `updateMany` and `updateManyAndReturn`, inside `AND`, `OR` and `NOT`, and in relation filters. This can break code that used one there; filter on the key's fields instead, e.g. `{ name, ownerId }`.
- 39134d4: `delete` now rejects a `where` without an `@id`, `@unique` or compound key with a `PrismaClientValidationError`, as Prisma does, instead of deleting every matching row and returning the first. Filters next to a unique key still work. This can break code that relied on the old behaviour, for example `delete({ where: { ownerId } })` to remove all of an owner's rows; use `deleteMany` for that.
- ec86890: `findUnique`, `findUniqueOrThrow`, `update` and `upsert` now reject a `where` without an `@id`, `@unique` or compound key with a `PrismaClientValidationError`, as Prisma does. Before, `findUnique` returned the first matching row, and `update` and `upsert` updated every matching row and returned the last. This can break code that relied on that, for example `update({ where: { ownerId } })` to change all of an owner's rows; use `updateMany` or `findFirst` for those.
- 50eb0a1: `create` and `update` on models with a compound key no longer check every row of the table for a compound key held as a field.
- aa28f09: `updateMany` and `updateManyAndReturn` no longer slow down quadratically with the number of rows they change. The changed rows are now picked by position instead of being read back with one `where` clause per row: updating 3000 rows went from ~590ms to ~3ms.
- 0679768: Nested `update`, `upsert` and `delete` on a to-many relation now resolve a compound key in their `where` against the related model. They used the parent model, so the key never matched: the update and delete threw "not found", and the upsert created a duplicate instead of updating.

## 1.2.0-alpha.1

### Patch Changes

- 9db701c: Resolve a model's compound `@@id` / `@@unique` keys once per query again, instead of for every row a `where` clause is matched against.

## 1.2.0-alpha.0

### Minor Changes

- ee1e5ca: Fix exponential cost of nested relation filters in `where` clauses. The part of a relation filter that does not depend on the row being matched is now evaluated once per query instead of once per candidate row, and existence checks (`some` / `none`) stop at the first match. A six level deep filter over 34 rows went from ~16s to under 1ms.

## 1.1.1

### Patch Changes

- 60d6133: Support compound `@@unique` and `@@id` keys with a custom `name`. Where clauses (`findUnique`, `update`, `upsert`, `delete`, nested `connect`, …) now use the custom name as the lookup key, like Prisma does: `@@unique([organizationId, userId], name: "orgUser")` is queried with `where: { orgUser: { organizationId, userId } }`.

  This also fixes filters such as `{ equals: … }` on a field with a single-field `@@unique([field])`, which never matched before (#132).

  Potentially breaking: when a constraint has a custom name, its default key (`organizationId_userId`) no longer matches anything. Prisma rejects that key with a validation error. Also, creating a record with a duplicate composite `@@id` now throws `P2002` like Prisma does. Before, the duplicate was inserted silently.

## 1.1.0

### Minor Changes

- 1560579: Add $clear function to clear state
- 4908115: Add $setInternalState method to manage internal state in createPrismaMock
- d827020: Automatic ID generation for MongoDB
- d827020: Support is / isNot filters in relation where clauses

### Patch Changes

- b8e4c87: Add unique constraint
- bb7e7fb: Add $clear into the return type

## 1.1.0-alpha.4

### Patch Changes

- b8e4c87: Add unique constraint

## 1.1.0-alpha.3

### Minor Changes

- d827020: Automatic ID generation for MongoDB
- d827020: Support is / isNot filters in relation where clauses

## 1.1.0-alpha.2

### Minor Changes

- 4908115: Add $setInternalState method to manage internal state in createPrismaMock

## 1.1.0-alpha.1

### Patch Changes

- bb7e7fb: Add $clear into the return type

## 1.1.0-alpha.0

### Minor Changes

- 1560579: Add $clear function to clear state

## 1.0.2

### Patch Changes

- dbb7861: Fix shallowCompare to handle date objects correctly

## 1.0.1

### Patch Changes

- 1cb3d6c: Add support for prisma v7

## 1.0.1-alpha.5

### Patch Changes

- dae2d1a: Try new build
- c76dbac: Fix build

## 1.0.1-alpha.4

### Patch Changes

- 6bef107: Add back NPM_TOKEN

## 1.0.1-alpha.3

### Patch Changes

- 914f68d: Update GitHub Actions workflow to use ubuntu-latest

## 1.0.1-alpha.2

### Patch Changes

- 0876510: Ensure npm 11.5.1 or later is installed

## 1.0.1-alpha.1

### Patch Changes

- e82ed1a: Update npm publish settings for oidc

## 1.0.1-alpha.0

### Patch Changes

- 1cb3d6c: Add support for prisma v7

## 1.0.0

### Major Changes

- 0b7a91e: Change the api interface & add dmmf generator

### Patch Changes

- d4a8818: Update createPrismaMock to make datamodel property optional, improving compatibility with Prisma DMMF.
- 29eaa9b: Add generic type parameter back to default createPrismaClient
- c621b0e: Improve datamodel handling
- d5637e1: Fix dmmf-generator
- 1a07011: Make datamodel optional when using default import
- 92ef1bc: Fix types
- d359764: Remove unneeded datamodel check in createPrismaClient
- ce2a428: Add missing @prisma/generator-helper dependancy
- b98101b: Use queryMatching for connect

## 1.0.0-alpha.9

### Patch Changes

- b98101b: Use queryMatching for connect

## 1.0.0-alpha.8

### Patch Changes

- c621b0e: Improve datamodel handling

## 1.0.0-alpha.7

### Patch Changes

- d4a8818: Update createPrismaMock to make datamodel property optional, improving compatibility with Prisma DMMF.

## 1.0.0-alpha.6

### Patch Changes

- 1a07011: Make datamodel optional when using default import

## 1.0.0-alpha.5

### Patch Changes

- 29eaa9b: Add generic type parameter back to default createPrismaClient

## 1.0.0-alpha.4

### Patch Changes

- d359764: Remove unneeded datamodel check in createPrismaClient

## 1.0.0-alpha.3

### Patch Changes

- 92ef1bc: Fix types

## 1.0.0-alpha.2

### Patch Changes

- ce2a428: Add missing @prisma/generator-helper dependancy

## 1.0.0-alpha.1

### Patch Changes

- d5637e1: Fix dmmf-generator

## 1.0.0-alpha.0

### Major Changes

- 0b7a91e: Change the api interface & add dmmf generator

## 0.12.2

### Patch Changes

- 739ff6a: Fix an issue where every did not work correctly

## 0.12.1

### Patch Changes

- 44ccf2d: correctly handle nested one-to-one updates and tidy tests

## 0.12.0

### Minor Changes

- 86b5525: Add indexes to increate performance (configurable with enableIndexes)

### Patch Changes

- ab157a0: Support @default(dbgenerated("gen_random_uuid()")) #23

## 0.11.2

### Patch Changes

- bb8b0e0: Add createManyAndReturn & updateManyAndReturn
