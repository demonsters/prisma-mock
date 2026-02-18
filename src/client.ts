import type { Prisma, PrismaClient } from "@prisma/client"
import { createDelegate } from "./delegate"
import createIndexes from "./indexes"
import { MockPrismaOptions, PrismaMockData } from "./types"
import { deepCopy } from "./utils/deepCopy"
import { getCamelCase, removeMultiFieldIds } from "./utils/fieldHelpers"

// Creates a mock Prisma client.
// @param prisma - The Prisma namespace or client constructor.
// @param options - Options for configuring the mock client:
//   - data: Initial mock data for your models (default: {}).
//   - datamodel: The Prisma datamodel, typically `Prisma.dmmf.datamodel`. Defaults to the Prisma client's datamodel.
//   - caseInsensitive: If true, string matching is case-insensitive (default: false).
//   - enableIndexes: If true, enables index lookups for performance (default: true).
//   - mockClient: Optionally provide your own mock client (jest-mock-extended or vitest-mock-extended) instance to use.
// @returns A mock Prisma client with all model methods and access to internal state.
function createPrismaMock<PClient extends PrismaClient, P extends typeof Prisma = typeof Prisma>(
  prisma: P,
  options: MockPrismaOptions<PClient, P> = {
    datamodel: prisma.dmmf?.datamodel,
    caseInsensitive: false,
    enableIndexes: true,
    data: {}
  }
): PClient & {
  $getInternalState: () => Required<PrismaMockData<PClient>>
  $setInternalState: (state: Required<PrismaMockData<PClient>>) => void
  $clear: () => void
} {

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

  // Create indexes if enabled in options
  const indexes = createIndexes(!!options.enableIndexes)

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
      // Handle callback function (serial execution with rollback on error)
      const snapshot = deepCopy(ref.data)
      try {
        // @ts-ignore
        return await actions(client)
      } catch (error) {
        // Rollback data on error
        ref.data = snapshot
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

  // Create delegate functions for model operations
  const Delegate = createDelegate({ ref, prisma, datamodel: options.datamodel, caseInsensitive, indexes })

  // Initialize each model in the datamodel
  options.datamodel.models.forEach((model) => {
    if (!model) return

    // Convert model name to camelCase for consistency
    const c = getCamelCase(model.name)

    // Initialize empty array for model if it doesn't exist
    if (!ref.data[c]) {
      ref.data = {
        ...(ref.data || {}),
        [c]: [],
      }
    }

    // Remove multi-field IDs from the data structure
    ref.data = removeMultiFieldIds(model, ref.data)

    // Set up indexes for each field in the model
    model.fields.forEach((field) => {
      const isPrimaryKey = !!model.primaryKey?.fields.includes(field.name)
      indexes.addIndexFieldIfNeeded(c, field, isPrimaryKey)
    })

    // Update indexes with existing data
    ref.data[c].forEach((item) => {
      indexes.updateItem(c, item, null)
    })

    // Create delegate functions for this model
    const objs = Delegate(c, model)

    // Bind delegate functions to the client
    Object.keys(objs).forEach((fncName) => {
      // Skip private methods (those starting with underscore)
      if (fncName.indexOf("_") === 0) return

      // Initialize model namespace if it doesn't exist
      if (!client[c]) client[c] = {}

      // Bind the delegate function to the client
      if (options.mockClient) {
        client[c][fncName].mockImplementation(async (...params) => {
          return objs[fncName](...params)
        })
      } else {
        client[c][fncName] = async (...params) => {
          return objs[fncName](...params)
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
