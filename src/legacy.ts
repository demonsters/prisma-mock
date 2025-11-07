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
  options?: Omit<MockPrismaOptions<typeof Prisma>, "data">) {

  let client = createPrismaMock<PrismaClient, typeof Prisma>(Prisma, {
    data,
    // @ts-ignore
    mockClient: mockClient || mockDeep<PrismaClient>(),
    datamodel: datamodel || Prisma.dmmf.datamodel,
    ...options
  })

  return client
}
