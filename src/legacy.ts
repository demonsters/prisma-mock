import { Prisma, PrismaClient } from "@prisma/client"
import createPrismaMock from "./client"
import { DeepMockApi, MockPrismaOptions, PrismaMockData } from "./types"
import { mockDeep } from "jest-mock-extended"

/**
 * @deprecated Use default export instead
 */
export default function createPrismaClient(
  data: PrismaMockData<PrismaClient> = {},
  datamodel?: Prisma.DMMF.Datamodel,
  mockClient?: DeepMockApi,
  options?: Omit<MockPrismaOptions, "data">) {

  if (datamodel !== Prisma.dmmf.datamodel) {
    throw new Error("datamodel !== Prisma.dmmf.datamodel is not supported, please use createPrismaMock instead")
  }

  let client = createPrismaMock<PrismaClient>(Prisma, {
    data,
    // @ts-ignore
    mockClient: mockClient || mockDeep<PrismaClient>(),
    ...options
  })

  return client
}
