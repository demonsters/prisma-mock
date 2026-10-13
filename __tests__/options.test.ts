// @ts-nocheck

import { Prisma } from "@prisma/client"
import createPrismaMock from "../src/client"
import createPrismaClient from "../src/index"

describe("options", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  test("the datamodel defaults to the client's when other options are passed", async () => {
    const client = createPrismaMock(Prisma, { data: { user: [{ id: 1, uniqueField: "a" }] } })
    expect(await client.user.findMany()).toEqual([{ id: 1, uniqueField: "a" }])
  })

  test("an option set to undefined falls back to its default", async () => {
    const client = createPrismaMock(Prisma, { datamodel: undefined, caseInsensitive: undefined, data: undefined })
    expect(await client.user.findMany()).toEqual([])
    await client.user.create({ data: { id: 1, uniqueField: "Alpha" } })
    expect(await client.user.findMany({ where: { uniqueField: "alpha" } })).toEqual([])
  })

  test("enableIndexes is still accepted", async () => {
    for (const enableIndexes of [true, false]) {
      const client = createPrismaClient({ data: { user: [{ id: 1, uniqueField: "a" }] }, enableIndexes })
      expect(await client.user.findUnique({ where: { id: 1 } })).toEqual({ id: 1, uniqueField: "a" })
    }
  })
})
