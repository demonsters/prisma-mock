import { Prisma, PrismaClient } from "@prisma/client/default"
import { MockPrismaOptions as MockPrismaOptionsBase } from "./types"
import createPrismaMock from "./client"

type MockPrismaOptions<P extends PrismaClient = PrismaClient> = Omit<MockPrismaOptionsBase<P, typeof Prisma>, "datamodel"> & {
  datamodel?: Prisma.DMMF.Datamodel
}

export default function createPrismaClient<P extends PrismaClient = PrismaClient>(options?: MockPrismaOptions<P>) {
  return createPrismaMock<P, typeof Prisma>(Prisma, {
    datamodel: Prisma.dmmf?.datamodel,
    ...options,
  })
}
