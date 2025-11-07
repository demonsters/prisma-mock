import { Prisma, PrismaClient } from "@prisma/client/default"
import { MockPrismaOptions } from "./types"
import createPrismaMock from "./client"

export default function createPrismaClient(options?: MockPrismaOptions<typeof Prisma>) {
  return createPrismaMock(Prisma, options)
}
