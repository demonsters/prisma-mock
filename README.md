# Prisma Mock

A comprehensive mock of the Prisma API intended for unit testing. All data is stored in memory, providing fast and reliable test execution without external dependencies.

The library optionally uses `jest-mock-extended` or `vitest-mock-extended` if you provide a mock client. If functionality you need is not implemented yet, you can mock it yourself.

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

### With Initial Data

You can optionally start with pre-filled data:

```js
import createPrismaMock from "prisma-mock"

const client = createPrismaMock({
  data: {
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
  },
})
```

### Example: Mocking a Global Prisma Instance

Example of how to mock a global prisma instance, for instance when it's the default export in a "db" directory (like in BlitzJS):

```js
import createPrismaMock from "prisma-mock"
import { mockDeep, mockReset } from "jest-mock-extended"

jest.mock("db", () => ({
  __esModule: true,
  ...jest.requireActual("db"),
  default: mockDeep(),
}))

import db from "db"

beforeEach(() => {
  mockReset(db)
  createPrismaMock({ mockClient: db })
})
```

## API

### Exports

The library provides three different exports:

- **`prisma-mock`** (default): The recommended way to use the library. Automatically uses the Prisma client from `@prisma/client/default`, so you don't need to pass Prisma as an argument.
- **`prisma-mock/client`**: Use this when you need to explicitly pass the Prisma namespace.
- **`prisma-mock/legacy`**: The old API for backward compatibility. This export is deprecated but maintained for existing codebases.

### Default Export (`prisma-mock`)

```ts
createPrismaMock<P extends PrismaClient = PrismaClient>(
  options?: {
    data?: PrismaMockData<P>
    datamodel?: Prisma.DMMF.Datamodel
    mockClient?: DeepMockApi
    caseInsensitive?: boolean
    enableIndexes?: boolean
  }
): P & { $getInternalState: () => Required<PrismaMockData<P>> }
```

### Parameters

- **`options`** (optional): Configuration options (see below)

#### Options

- **`data`** (optional): Initial mock data for the Prisma models. An object containing keys for tables and values as arrays of objects.
- **`datamodel`** (optional): The Prisma datamodel, typically `Prisma.dmmf.datamodel` (default).
- **`mockClient`** (optional): A `jest-mock-extended` or `vitest-mock-extended` instance. If not provided, a plain object is used instead.
- **`caseInsensitive`** (boolean, default: `false`): If true, all string comparisons are case insensitive
- **`enableIndexes`** (boolean, default: `true`) If true, enables indexing for better query performance on primary keys, unique fields, and foreign keys

### Return Value

Returns a mock Prisma client with all standard model methods plus:

- `$getInternalState()`: Method to access the internal data state for testing/debugging

### Client Export (`prisma-mock/client`)

```ts
createPrismaMock<PClient extends PrismaClient, P extends typeof Prisma = typeof Prisma>(
  prisma: P,
  options?: {
    data?: PrismaMockData<PClient>
    datamodel?: P["dmmf"]["datamodel"]
    mockClient?: DeepMockApi
    caseInsensitive?: boolean
    enableIndexes?: boolean
  }
): PClient & { $getInternalState: () => Required<PrismaMockData<PClient>> }
```

#### Parameters

- **`prisma`** (required): The Prisma namespace (e.g., `Prisma` from `@prisma/client`). This is used to access the datamodel and type information.
- **`options`** (optional): Configuration options. Same as the default export, with the exception of the `datamodel` not being optional.

### Legacy Export (`prisma-mock/legacy`)

The legacy export maintains the old API signature for backward compatibility:

```js
import createPrismaMock from "prisma-mock/legacy"
import { mockDeep } from "jest-mock-extended"

const client = createPrismaMock(
  { user: [{ id: 1, name: "John" }] }, // data
  Prisma.dmmf.datamodel, // datamodel (optional)
  mockDeep(), // mockClient (optional)
  { enableIndexes: true } // options (optional)
)
```

**Note**: If you're starting a new project, use the default export instead. The legacy export is only for maintaining existing codebases that haven't migrated yet.

## DMMF Generator

The library includes a Prisma generator that can be used to generate the datamodel separately. This is useful when you need to use the datamodel without having the full Prisma client available, or when you want to use a specific version of the datamodel.

### When to Use the DMMF Generator

You typically need the DMMF generator when:

- You're running tests with jsdom
- When you have a custom export directory for the Prisma client
- You're building a tool that needs the datamodel structure without the full Prisma client
- You want to use a specific version of the datamodel that differs from the current Prisma client

### Setup

Add the generator to your `schema.prisma` file:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator dmmf {
  provider = "prisma-mock"
  output   = "./generated/dmmf"
}
```

After running `prisma generate`, the datamodel will be exported to the specified output path. You can then import and use it:

```js
import createPrismaMock from "prisma-mock/client"
import { Prisma } from "@prisma/client"
import * as dmmf from "./generated/dmmf"

const client = createPrismaMock(Prisma, {
  datamodel: dmmf,
})
```

**Note**: In most cases, you don't need the generator. The library will automatically use `Prisma.dmmf.datamodel` from your Prisma client if you don't provide a custom datamodel.

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
- `groupBy`

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

### Referential Actions

- `onDelete: Restrict`
- `onDelete: NoAction`
- `onDelete: SetDefault`
- `onUpdate` actions

### Prisma Client Methods

- `$use` (Middleware)

## Performance Features

### Indexing

Indexing is enabled by default for better query performance. Indexes are automatically created for:

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
