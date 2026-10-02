// @ts-nocheck

import { Prisma } from "@prisma/client"
import createIndexes from "../src/indexes"
import createPrismaMock from "../src/client"
import createPrismaClient from "../src/index"

jest.mock("../src/indexes", () => {
  const actual = jest.requireActual("../src/indexes")
  return { __esModule: true, default: jest.fn(actual.default) }
})

describe("options", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  beforeEach(() => {
    createIndexes.mockClear()
  })

  test("indexes are enabled when no options are passed", () => {
    createPrismaMock(Prisma)
    expect(createIndexes).toHaveBeenCalledWith(true)
  })

  test("indexes stay enabled when other options are passed", () => {
    createPrismaMock(Prisma, { datamodel: Prisma.dmmf.datamodel, data: {} })
    expect(createIndexes).toHaveBeenCalledWith(true)
  })

  test("indexes stay enabled when enableIndexes is undefined", () => {
    createPrismaMock(Prisma, { datamodel: Prisma.dmmf.datamodel, enableIndexes: undefined })
    expect(createIndexes).toHaveBeenCalledWith(true)
  })

  test("indexes can be disabled", () => {
    createPrismaMock(Prisma, { datamodel: Prisma.dmmf.datamodel, enableIndexes: false })
    expect(createIndexes).toHaveBeenCalledWith(false)
  })

  test("the package entry point enables indexes when options are passed", () => {
    createPrismaClient({ data: {} })
    expect(createIndexes).toHaveBeenCalledWith(true)
  })

  test("the datamodel defaults to the client's when other options are passed", async () => {
    const client = createPrismaMock(Prisma, { data: { user: [{ id: 1, uniqueField: "a" }] } })
    expect(await client.user.findMany()).toEqual([{ id: 1, uniqueField: "a" }])
  })
})
