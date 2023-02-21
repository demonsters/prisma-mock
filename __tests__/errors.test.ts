// @ts-nocheck

import { PrismaClientKnownRequestError } from "@prisma/client/runtime"
import createPrismaClient from "./createPrismaClient"

const data = {
  account: [
    {
      name: "sadfsdf",
      sort: null,
    },
    {
      name: "adsfasdf2",
      sort: null,
    },
  ],
  user: [
    {
      accountId: 1,
      clicks: null,
      deleted: false,
      name: "Admin",
      sort: null,
      role: "ADMIN",
      uniqueField: "first",
    },
  ],
}

test("findFirstOrThrow", async () => {
  const client = await createPrismaClient(data)
  const accounts = await client.account.findFirstOrThrow({
    where: { id: 1 },
  })
  expect(accounts).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": "sadfsdf",
  "sort": null,
}
`)
  try {
    const result = await client.account.findFirstOrThrow({
      where: { id: 0 },
    })
    throw new Error("Test should not reach here")
  } catch (e) {
    expect(e instanceof PrismaClientKnownRequestError).toBe(true)
    expect(e.message).toContain(
      "No Account found"
    )
  }
})



test("delete", async () => {
  const client = await createPrismaClient()
  try {
    const user = await client.account.delete({
      where: {
        id: 1,
      },
    })
    throw new Error("Test should not reach here")
  } catch (e) {
    expect(e.code).toBe("P2025")
    expect(e.meta.cause).toBe("Record to delete does not exist.")
    expect(e instanceof PrismaClientKnownRequestError).toBe(true)
    expect(e.message).toContain(
      "An operation failed because it depends on one or more records that were required but not found. Record to delete does not exist."
    )
  }
})



test.todo("Should throw when foreign key is invalid")
test.todo("Argument create is missing.")
test.todo("Argument uniqueField for data.uniqueField is missing.")
test.todo("Unique constraint failed on the fields: (`")
test.todo("Unknown arg `disconnect` in data.account.disconnect (when not optional)")


describe("Not implemented", () => {

  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    return
  }

  describe.each(["aggregate", "groupBy"])("Not implemented %p", (fnc) => {
    test("Should throw when function not implemented", async () => {
      const client = await createPrismaClient()
      expect(client.account[fnc]).rejects.toThrow(`${fnc} is not yet implemented in prisma-mock`)
    })
  })
  test("Should throw when function not implemented", async () => {
    const client = await createPrismaClient()
    expect(client.$use(() => {})).rejects.toThrow(`$use is not yet implemented in prisma-mock`)
  })
})