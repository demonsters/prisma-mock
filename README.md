# Prisma Mock

This is a mock of the Prisma API intended for unit testing. All the data is stored in memory.

The library `jest-mock-extended` is used, which means that if functionality you need is not implemented yet, you can mock it yourself.

# Usage

Simple example how to create a prisma mock instance:

```js
import createPrismaMock from "prisma-mock"

let client

beforeEach(() => {
  client = createPrismaMock()
})
```

An example how to mock a global prisma instance, as the default export in a "db" directory (like blitzjs):

```js
import createPrismaMock from "prisma-mock"
import { mockDeep, mockReset } from "jest-mock-extended"

jest.mock("db", () => ({
  __esModule: true,
  ...jest.requireActual("db"),
  default: mockDeep(),
}))

import db, { Prisma } from "db"

beforeEach(() => {
  mockReset(db)
  createPrismaMock({}, Prisma.dmmf.datamodel)
})
```

# API

```ts
createPrismaMock(
  data: PrismaMockData<P> = {},
  datamodel?: Prisma.DMMF.Datamodel,
  client = mockDeep<P>(),
  options: {
    caseInsensitive?: boolean
  } = {}
): Promise<P>
```

#### Arg: `data`

You can optionally start up a pre-filled db, by passing in an object containing keys for tables, and values as arrays of objects (though using `create` is preferred). Example:

```js
createPrismaMock({
  user: [
    {
      id: 1,
      name: "John Doe",
      accountId: 1,
    },
  ],
  account: [
    {
      id: 1,
      name: "Company",
    },
  ],
})
```

#### Arg: `datamodel`

The datamodel of the prisma client, value of `Prisma.dmmf.datamodel`.

#### Arg: `client`

A `jest-mock-extended` instance. If not provided, a new instance is created.

#### Arg: `caseInsensitive`

If true, all string comparisons are case insensitive.



# Supported features

Most common cases are covered, but not everything. Here is a rough list of the supported features:

## Model queries

- findUnique,
- findMany,
- findFirst,
- findFirstOrThrow,
- create,
- createMany
- delete,
- update,
- deleteMany,
- updateMany
- upsert
- count
- TODO: aggregate
- TODO: groupBy

## Model query options

- distinct
- include
- where
- select
- orderBy
- TODO: select: \_count

## Nested queries

- create
- createMany
- update
- updateMany
- delete
- deleteMany
- connect
- disconnect
- TODO: set
- TODO: connectOrCreate
- TODO: upsert

## Filter conditions and operators

- equals
- gt
- gte
- lt
- lte
- not
- in
- notIn
- contains
- startWith
- endsWith
- AND
- OR
- NOT
- mode
- TODO: search

## Relation filters

- some
- every
- none
- TODO: is

## Scalar list methods

TODO (set, push)

## Scalar list filters

TODO (has, hasEvery, hasSome, isEmpty, equals)

## Atomic number operations

- increment
- decrement
- multiply
- divide
- set

## JSON filters

TODO (path, string_contains, string_starts_with, string_ends_with, array_contains, array_starts_with, array_ends_with)

## Attributes

- @@id
- @default
- @unique (TODO: no error if duplicate)
- @@unique (TODO: no error if duplicate)
- @relation
- @updatedAt: Partially supported, value is set at creation (TODO: update value on update)

## Attribute functions

- autoincrement()
- TODO: auto()
- cuid()
- TODO: uuid()
- now()
- TODO: dbgenerated()

## Referential actions

- onDelete (SetNull, Cascade)
- TODO: onDelete: Restrict, NoAction, SetDefault
- TODO: onUpdate

## Prisma Client methods

- $transaction
- TODO: $transaction (interactive)
- TODO: $transaction (isolation) 