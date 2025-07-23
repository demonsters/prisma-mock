import { Prisma } from "@prisma/client"
import { createDelegate } from "./delegate"
import createIndexes from "./indexes"
import { DeepMockApi, Item, MockPrismaOptions, PrismaMockData } from "./types"
import { deepCopy } from "./utils/deepCopy"
import { getCamelCase, removeMultiFieldIds } from "./utils/fieldHelpers"

/**
 * Creates a mock Prisma client with the specified data and options
 * @param data - Initial mock data for the Prisma models
 * @param datamodel - Prisma datamodel (defaults to Prisma.dmmf.datamodel)
 * @param mockClient - Optional existing mock client to extend
 * @param options - Configuration options for the mock client
 * @returns A mock Prisma client with all model methods and internal state access
 */
const createPrismaMock = <P>(
  data: PrismaMockData<P> = {},
  datamodel = Prisma.dmmf.datamodel,
  mockClient: DeepMockApi,
  options: MockPrismaOptions = {
    caseInsensitive: false,
    enableIndexes: false,
  }
): P & {
  $getInternalState: () => Required<PrismaMockData<P>>
} => {

  // Reference object to hold the mock data state
  let ref = {
    data,
  }
  // Initialize the mock client (either use provided one or create new)
  let client = mockClient ? mockClient : {}

  /**
   * Helper function to implement mock methods consistently
   * @param name - Method name to mock
   * @param fnc - Function implementation
   */
  const mockImplementation = (name: string, fnc: any) => {
    if (mockClient) {
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
  const Delegate = createDelegate(ref, datamodel, caseInsensitive, indexes)

  // Initialize each model in the datamodel
  datamodel.models.forEach((model) => {
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
      if (mockClient) {
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

  // @ts-ignore
  return client
}

export default createPrismaMock
