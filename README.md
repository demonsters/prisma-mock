
# Prisma Mock

This is a mock of the Prisma API intended for unit testing. All the data is stored in memory.

The library `jest-mock-extended` is used, which means that if functionality you need is not implemented yet, you can mock it yourself.

# Usage

Simple example how to create a prisma mock instance:

```js
import createPrismaMock from "prisma-mock"

let client

beforeEach(async () => {
  client = await createPrismaMock()
}
```


An example how to mock a global prisma instance inside and schema a "db" directory (like blitzjs):

```js
import createPrismaMock from "prisma-mock"
import { mockDeep, mockReset } from "jest-mock-extended"

jest.mock("db", () => ({
  __esModule: true,
  ...jest.requireActual('db'),
  default: mockDeep()
}))

import db from "db"

beforeEach(() => {
  mockReset(db)
  return createPrismaMock({}, "db/schema.prisma", db)
})
```


# API

```ts
createPrismaMock(
  data: PrismaMockData<P> = {},
  pathToSchema?: string,
  client = mockDeep<P>()
): Promise<P>
```

## data

Object with an array per table of default data (using `create` is preferred). Example:

```js
createPrismaMock({
  users: [
    {
      id: 1,
      name: "John Doe",
      accountId: 1
    }
  ],
  account: [
    {
      id: 1,
      name: "Company",
    }
  ]
})
```


## pathToSchema
Path to the schema file. If not provided, the schema is `prisma/schema.prisma`.

## client
`jest-mock-extended` instance used. If not provided, a new instance is created.


# Supported features
Alot of the functionality is implemented, but parts are missing. Here is a list of the (missing) features:

## Model queries
- findUnique,
- findMany,
- findFirst,
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
- TODO: select
- TODO: orderBy
- TODO: select: _count

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
- TODO: search
- TODO: mode

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
- TODO: @updatedAt

## Attribute functions
- autoincrement()
- TODO: auto()
- TODO: cuid()
- TODO: uuid()
- TODO: now()
- TODO: dbgenerated()

## Referential actions
- onDelete (SetNull, Cascade)
- TODO: onDelete: Restrict, NoAction, SetDefault
- TODO: onUpdate

