// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// An interactive transaction rolls back to the data as it was when it started, which it keeps
// by reference: writes replace the data, its tables and its rows rather than change them.
// These check a rollback also leaves the lookups by value describing that data
describe.each([true, false])("rolling back an interactive transaction (enableIndexes: %s)", (enableIndexes) => {
  const data = {
    user: [
      { id: 1, uniqueField: "a" },
      { id: 2, uniqueField: "b" },
    ],
  }

  const rollback = (client, fn) =>
    expect(
      client.$transaction(async (tx) => {
        await fn(tx)
        throw new Error("rollback")
      })
    ).rejects.toThrow("rollback")

  test("undoes an update, and lookups by the old and new value", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    await rollback(client, (tx) => tx.user.update({ where: { uniqueField: "a" }, data: { uniqueField: "c" } }))

    expect(await client.user.findUnique({ where: { uniqueField: "c" } })).toBeNull()
    expect(await client.user.update({ where: { uniqueField: "a" }, data: { name: "A" } })).toMatchObject({ id: 1, name: "A" })
    await client.user.create({ data: { id: 3, uniqueField: "c" } })
  })

  test("undoes a create", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    await rollback(client, (tx) => tx.user.create({ data: { id: 3, uniqueField: "c" } }))

    expect(await client.user.findUnique({ where: { id: 3 } })).toBeNull()
    expect(await client.user.count()).toBe(2)
    await client.user.create({ data: { id: 3, uniqueField: "c" } })
  })

  test("undoes a delete", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    await rollback(client, (tx) => tx.user.delete({ where: { uniqueField: "b" } }))

    expect(await client.user.findUnique({ where: { uniqueField: "b" } })).toMatchObject({ id: 2 })
    await expect(client.user.create({ data: { id: 3, uniqueField: "b" } })).rejects.toMatchObject({ code: "P2002" })
  })
})
