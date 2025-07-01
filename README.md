# Prisma Mock

A comprehensive mock of the Prisma API intended for unit testing. All data is stored in memory, providing fast and reliable test execution without external dependencies.

The library uses `jest-mock-extended` or `vitest-mock-extended`, which means that if functionality you need is not implemented yet, you can mock it yourself.

## Installation

```bash
npm install prisma-mock --save-dev
# or
yarn add prisma-mock --dev
```

## Usage

### Basic Example

Simple example of how to create a prisma mock instance:

```js
import createPrismaMock from "prisma-mock"

let client

beforeEach(() => {
  client = createPrismaMock()
})
```

### Mocking Global Prisma Instance

Example of how to mock a global prisma instance, as the default export in a "db" directory (like BlitzJS):

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

### With Initial Data

You can optionally start with pre-filled data:

```js
const client = createPrismaMock({
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

## API

```ts
createPrismaMock(
  data: PrismaMockData<P> = {},
  datamodel?: Prisma.DMMF.Datamodel,
  client = mockDeep<P>(),
  options: {
    caseInsensitive?: boolean
    enableIndexes?: boolean
  } = {}
): Promise<P>
```

### Parameters

#### `data` (optional)

Initial mock data for the Prisma models. An object containing keys for tables and values as arrays of objects.

#### `datamodel` (optional)

The Prisma datamodel, typically `Prisma.dmmf.datamodel`. Defaults to the current Prisma client's datamodel.

#### `client` (optional)

A `jest-mock-extended` instance. If not provided, a new instance is created.

#### `options` (optional)

Configuration options for the mock client:

- **`caseInsensitive`** (boolean, default: `false`): If true, all string comparisons are case insensitive
- **`enableIndexes`** (boolean, default: `false`) Experimental: If true, enables indexing for better query performance on primary keys, unique fields, and foreign keys

### Return Value

Returns a mock Prisma client with all standard model methods plus:

- `$getInternalState()`: Method to access the internal data state for testing/debugging

## Supported Features

### Model Queries ✅

- `findUnique` / `findUniqueOrThrow`
- `findMany`
- `findFirst` / `findFirstOrThrow`
- `create`
- `createMany`
- `delete`
- `update`
- `deleteMany`
- `updateMany`
- `upsert`
- `count`
- `aggregate`

### Model Query Options ✅

- `distinct`
- `include`
- `where`
- `select`
- `orderBy`
- `select: _count`

### Nested Queries ✅

- `create`
- `createMany`
- `update`
- `updateMany`
- `delete`
- `deleteMany`
- `connect`
- `disconnect`
- `set`
- `upsert`

### Filter Conditions and Operators ✅

- `equals`
- `gt`, `gte`, `lt`, `lte`
- `not`
- `in`, `notIn`
- `contains`, `startsWith`, `endsWith`
- `AND`, `OR`, `NOT`
- `mode` (for case-insensitive matching)

### Relation Filters ✅

- `some`
- `every`
- `none`

### Atomic Number Operations ✅

- `increment`
- `decrement`
- `multiply`
- `divide`
- `set`

### JSON Filters ✅

- `path`
- `string_contains`
- `string_starts_with`
- `string_ends_with`
- `array_contains`
- `array_starts_with`
- `array_ends_with`

### Attributes ✅

- `@@id` (Primary keys)
- `@default` (Default values)
- `@unique` (Unique constraints)
- `@@unique` (Compound unique constraints)
- `@relation` (Relationships)
- `@updatedAt` (Partially supported - set at creation)

### Attribute Functions ✅

- `autoincrement()`
- `cuid()`
- `uuid()`
- `now()`

### Referential Actions ✅

- `onDelete: SetNull`
- `onDelete: Cascade`

### Prisma Client Methods ✅

- `$transaction` (Array of promises)
- `$transaction` (Interactive transactions with rollback)
- `$connect`
- `$disconnect`

## Not Yet Implemented

The following features are planned but not yet implemented:

### Model Queries

- `groupBy`

### Nested Queries

- `connectOrCreate`

### Filter Conditions

- `search` (Full-text search)

### Relation Filters

- `is`

### Scalar List Methods

- `set`
- `push`

### Scalar List Filters

- `has`
- `hasEvery`
- `hasSome`
- `isEmpty`
- `equals`

### Attributes

- `auto()`
- `dbgenerated()`

### Referential Actions

- `onDelete: Restrict`
- `onDelete: NoAction`
- `onDelete: SetDefault`
- `onUpdate` actions

### Prisma Client Methods

- `$transaction` (Isolation levels)
- `$use` (Middleware)

## Performance Features

### Indexing (Experimental)

Enable indexing for better query performance:

```js
const client = createPrismaMock({}, undefined, undefined, {
  enableIndexes: true,
})
```

When enabled, indexes are automatically created for:

- Primary key fields
- Unique fields
- Foreign key fields

This can significantly improve query performance for large datasets.

## Error Handling

The mock client throws appropriate Prisma errors with correct error codes:

- `P2025`: Record not found (for `findUniqueOrThrow`, `findFirstOrThrow`)
- `P2002`: Unique constraint violation
- `P2003`: Foreign key constraint violation

## Testing

### Writing Tests

Create your tests in the `__tests__` directory. You can use snapshot testing with either `expect(res).toMatchSnapshot()` or `expect(res).toMatchInlineSnapshot()`.

**Note**: If you choose to use snapshot testing, make sure to first run your tests against the real database to create a snapshot of the expected result.

### Running Tests

To run tests against a PostgreSQL database:

```bash
yarn run test:postgres
```

To run tests against prisma-mock (in-memory database):

```bash
yarn test
```

## Development

### Requirements

Create a `.env-cmdrc` file in the root of your project with the following content:

```json
{
  "postgres": {
    "PROVIDER": "postgresql",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
  }
}
```

### Building

```bash
yarn build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
