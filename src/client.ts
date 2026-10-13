import type { Prisma, PrismaClient } from "@prisma/client"
import { createDelegate, delegateMethodNames } from "./delegate"
import { MockPrismaOptions, PrismaMockData } from "./types"
import { deepCopy } from "./utils/deepCopy"
import { getCamelCase, removeMultiFieldIds } from "./utils/fieldHelpers"

// Creates a mock Prisma client.
// @param prisma - The Prisma namespace or client constructor.
// @param options - Options for configuring the mock client:
//   - data: Initial mock data for your models (default: {}).
//   - datamodel: The Prisma datamodel, typically `Prisma.dmmf.datamodel`. Defaults to the Prisma client's datamodel.
//   - caseInsensitive: If true, string matching is case-insensitive (default: false).
//   - enableIndexes: Deprecated, has no effect. Lookups by key are always fast.
//   - mockClient: Optionally provide your own mock client (jest-mock-extended or vitest-mock-extended) instance to use.
// @returns A mock Prisma client with all model methods and access to internal state.
function createPrismaMock<PClient extends PrismaClient, P extends typeof Prisma = typeof Prisma>(
  prisma: P,
  passedOptions: Partial<MockPrismaOptions<PClient, P>> = {}
): PClient & {
  $getInternalState: () => Required<PrismaMockData<PClient>>
  $setInternalState: (state: Required<PrismaMockData<PClient>>) => void
  $clear: () => void
} {

  // Every option falls back to its default when it is left out or undefined, not only
  // when no options are passed at all
  const options: MockPrismaOptions<PClient, P> = {
    datamodel: prisma.dmmf?.datamodel,
    caseInsensitive: false,
    data: {},
  }
  for (const [key, value] of Object.entries(passedOptions)) {
    if (value !== undefined) {
      options[key] = value
    }
  }

  let internalState = options.data ? deepCopy(options.data) : {}

  // Reference object to hold the mock data state
  let ref = {
    data: internalState,
  }

  // Initialize the mock client (either use provided one or create new)
  let client = options.mockClient ? options.mockClient : {}

  /**
   * Helper function to implement mock methods consistently
   * @param name - Method name to mock
   * @param fnc - Function implementation
   */
  const mockImplementation = (name: string, fnc: any) => {
    if (options.mockClient) {
      client[name].mockImplementation(fnc)
    } else {
      client[name] = fnc
    }
  }

  // Determine if case-insensitive matching should be used
  const caseInsensitive = options.caseInsensitive || false

  // Mock $transaction method for handling database transactions
  mockImplementation("$transaction", async (actions: Promise<any>[] | ((prisma: P) => Promise<any>)) => {
    const res = []
    if (Array.isArray(actions)) {
      // Handle array of promises (parallel execution)
      for (const action of actions) {
        res.push(await action)
      }
      return res
    } else {
      // Handle callback function (serial execution with rollback on error). Writes replace
      // the data, its tables and its rows rather than change them, so the data as it is now
      // is the state to roll back to, without a copy
      const snapshot = ref.data
      const links = Delegate.getManyToManyLinks()
      try {
        // @ts-ignore
        return await actions(client)
      } catch (error) {
        // Rollback data on error
        ref.data = snapshot
        Delegate.setManyToManyLinks(links)
        throw error
      }
    }
  })

  // Mock connection methods
  mockImplementation("$connect", async () => { })
  mockImplementation("$disconnect", async () => { })
  mockImplementation("$use", async () => {
    throw new Error("$use is not yet implemented in prisma-mock")
  })

  // Runs one operation of the client. When it fails, the data goes back to what it was
  // before, as Prisma rolls back every write of a query that fails, nested ones included.
  // Writes replace the data rather than change it, so that is the data as it was, as for
  // $transaction, and the many-to-many links with it
  const runQuery = (fnc: () => any) => {
    const snapshot = ref.data
    const links = Delegate.getManyToManyLinks()
    try {
      return fnc()
    } catch (error) {
      Delegate.setManyToManyLinks(links)
      ref.data = snapshot
      throw error
    }
  }

  // Create delegate functions for model operations
  const Delegate = createDelegate({ ref, prisma, datamodel: options.datamodel, caseInsensitive })

  // An empty table for each model the data leaves out, added in one copy of the data rather
  // than one per model
  const missingTables = options.datamodel.models.filter((model) => model && !ref.data[getCamelCase(model.name)])
  if (missingTables.length > 0) {
    ref.data = { ...(ref.data || {}) }
    for (const model of missingTables) {
      ref.data[getCamelCase(model.name)] = []
    }
  }

  // Initialize each model in the datamodel
  options.datamodel.models.forEach((model) => {
    if (!model) return

    // Convert model name to camelCase for consistency
    const c = getCamelCase(model.name)

    // Remove multi-field IDs from the data structure
    ref.data = removeMultiFieldIds(model, ref.data)

    // Bind the delegate functions to the client. The delegate is built the first time one of
    // them runs: it holds a closure per operation and the caches of its table, and a test
    // usually touches only a few of the models
    if (!client[c]) client[c] = {}
    delegateMethodNames.forEach((fncName) => {
      if (options.mockClient) {
        client[c][fncName].mockImplementation(async (...params) => {
          return runQuery(() => Delegate(c, model)[fncName](...params))
        })
      } else {
        client[c][fncName] = async (...params) => {
          return runQuery(() => Delegate(c, model)[fncName](...params))
        }
      }
    })
  })


  // Add method to access internal state for testing/debugging
  client['$getInternalState'] = () => ref.data
  client['$setInternalState'] = (state: Required<PrismaMockData<PClient>>) => {
    internalState = deepCopy(state)
    ref.data = internalState
  }
  client['$clear'] = () => {
    ref.data = internalState
  }

  // @ts-ignore
  return client
}

export default createPrismaMock
