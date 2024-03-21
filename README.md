# Prisma Mock

This is a mock of the Prisma API intended for unit testing. All the data is stored in memory.

By leveraging the `deepMock` functionality provided by external libraries, we've achieved mocking capabilities. This means that if the functionality you need is not implemented yet, you can mock it yourself.

# Installation

From version x.x.x onwards, you can choose your mocking library.

The requirement is compatibility with the `deepMock` of `jest-mock-extended`. Currently, compatibility has been confirmed with `vitest-mock-extended`.

### Adding to package.json

Add your desired mock library to the devDependencies in `package.json`.

```json
"devDependencies": {
  "jest-mock-extended": "^2.0.4",
```

### Incorporating deepMock into prismaMock

You need to actively pass the `deepMock` function to `prisma-mock` from the testing process.

Typically in a jest-enabled environment, it can be bootstrapped in
`jest.config.js` as follows:

```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts']
```

And prepare the setup file as:

```typescript
import { mockDeep } from "jest-mock-extended"
import { initPrismaMockLibrary } from 'prisma-mock';

beforeAll(() => initPrismaMockLibrary({ mockDeep }))
```

In a vitest-enabled environment, it can be done as follows:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./__tests__/vitest.setup.ts']
````

And prepare the setup file as:

```typescript
import { mockDeep } from "vitest-mock-extended"
import { initPrismaMockLibrary } from 'prisma-mock';

beforeAll(() => initPrismaMockLibrary({ mockDeep }))
```


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
- findUniqueOrThrow,
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
- select: \_count

## Nested queries

- create
- createMany
- update
- updateMany
- delete
- deleteMany
- connect
- disconnect
- set
- upsert
- TODO: connectOrCreate

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

- path
- string_contains
- string_starts_with 
- string_ends_with
- array_contains
- array_starts_with
- array_ends_with

## Attributes

- @@id
- @default
- @unique
- @@unique (TODO: no error if duplicate)
- @relation
- @updatedAt: Partially supported, value is set at creation (TODO: update value on update)

## Attribute functions

- autoincrement()
- TODO: auto()
- cuid()
- uuid()
- now()
- TODO: dbgenerated()

## Referential actions

- onDelete (SetNull, Cascade)
- TODO: onDelete: Restrict, NoAction, SetDefault
- TODO: onUpdate

## Prisma Client methods

- $transaction
- $transaction (interactive)
- TODO: $transaction (isolation)

# Contribution

## Requirements

Create a `.env-cmdrc` file in the root of your project with the following content:

```json
{
  "postgres": {
    "PROVIDER": "postgresql",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
  }
}
```

## Writing Tests
Create your tests in the `__tests__` directory. You can use snapshot testing with either `expect(res).toMatchSnapshot()` or `expect(res).toMatchInlineSnapshot()`. This captures the result of your tests in a snapshot, which you can use to compare agains prisma-mock results.

Note: If you choose to use snapshot testing, make shore to first run your tests against the real database to create a snapshot of the expected result.

## Running Tests
To run tests against a postgres database, run the following command:

```bash
yarn run test:postgres
```

To run tests against prisma-mock (in-memory database), run:

```bash
yarn test
```
