import { Prisma, PrismaClient } from "@prisma/client"
import { MockPrismaOptions } from "./types"
import createPrismaMock from "./client"

export default function createPrismaClient(options?: MockPrismaOptions) {
  return createPrismaMock<PrismaClient>(Prisma, options)
}
