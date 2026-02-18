// @ts-nocheck

import { Prisma, PrismaClient } from "../generated/mongodb-client"
import createPrismaMock from "../src/client"

export default async function createPrismaClientMongo(data?: any, options?: any) {
  const client = createPrismaMock<PrismaClient>(Prisma, {
    enableIndexes: true,
    datamodel: Prisma.dmmf?.datamodel,
    ...options,
  })
  if (data) {
    const modelNames = Object.keys(data)
    for (const modelName of modelNames) {
      const model = data[modelName]
      await client[modelName].createMany({ data: model })
    }
  }
  return client
}
