import { Prisma } from "@prisma/client"
import { ResetDefaults } from "./defaults"
import { createDelegate } from "./delegate"
import createIndexes from "./indexes"
import { DeepMockApi, Item, MockPrismaOptions, PrismaMockData } from "./types"
import { deepCopy } from "./utils/deepCopy"
import { getCamelCase, removeMultiFieldIds } from "./utils/fieldHelpers"

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

  let ref = {
    data,
  }
  let client = mockClient ? mockClient : {}

  const mockImplementation = (name: string, fnc: any) => {
    if (mockClient) {
      client[name].mockImplementation(fnc)
    } else {
      client[name] = fnc
    }
  }

  const indexes = createIndexes(!!options.enableIndexes)

  const caseInsensitive = options.caseInsensitive || false

  ResetDefaults()

  mockImplementation("$transaction", async (actions: Promise<any>[] | ((prisma: P) => Promise<any>)) => {
    const res = []
    if (Array.isArray(actions)) {
      for (const action of actions) {
        res.push(await action)
      }
      return res
    } else {
      const snapshot = deepCopy(ref.data)
      try {
        // @ts-ignore
        return await actions(client)
      }
      catch (error) {
        ref.data = snapshot
        throw error
      }
    }
  })

  mockImplementation("$connect", async () => { })
  mockImplementation("$disconnect", async () => { })
  mockImplementation("$use", async () => {
    throw new Error("$use is not yet implemented in prisma-mock")
  })

  const Delegate = createDelegate(ref, datamodel, caseInsensitive, indexes)

  datamodel.models.forEach((model) => {
    if (!model) return
    const c = getCamelCase(model.name)
    if (!ref.data[c]) {
      ref.data = {
        ...(ref.data || {}),
        [c]: [],
      }
    }
    ref.data = removeMultiFieldIds(model, ref.data)

    model.fields.forEach((field) => {
      indexes.addIndexFieldIfNeeded(c, field, !!model.primaryKey?.fields.includes(field.name))
    })

    ref.data[c].forEach((item) => {
      indexes.updateItem(c, item, null)
    })

    const objs = Delegate(c, model)
    Object.keys(objs).forEach((fncName) => {
      if (fncName.indexOf("_") === 0) return
      if (!client[c]) client[c] = {}
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

  client['$getInternalState'] = () => ref.data

  // @ts-ignore
  return client
}

export default createPrismaMock
