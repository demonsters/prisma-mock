import { Prisma, PrismaClient } from "@prisma/client/default"
import { MockPrismaOptions } from "./types"
import createPrismaMock from "./client"

export default function createPrismaClient<P extends PrismaClient = PrismaClient>(options?: MockPrismaOptions<P, typeof Prisma>) {
  return createPrismaMock<P, typeof Prisma>(Prisma, options)
}
