// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// delete and deleteMany find the rows a unique where points at through a lookup of the rows
// holding each value, which creates, updates and deletes carry forward
describe("delete by a unique where", () => {
  const data = {
    user: [
      { id: 1, uniqueField: "a" },
      { id: 2, uniqueField: "b" },
      { id: 3, uniqueField: "c" },
    ],
  }

  const userIds = async (client) =>
    (await client.user.findMany({ orderBy: { id: "asc" } })).map((user) => user.id)

  test("removes the row and returns it", async () => {
    const client = await createPrismaClient(data)

    const deleted = await client.user.delete({ where: { uniqueField: "b" } })

    expect(deleted).toMatchObject({ id: 2, uniqueField: "b" })
    expect(await userIds(client)).toEqual([1, 3])
  })

  test("by a compound key", async () => {
    const client = await createPrismaClient({
      user: [{ id: 1, uniqueField: "u1" }],
      pet: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }],
    })

    await client.pet.delete({ where: { name_ownerId: { name: "Rex", ownerId: 1 } } })

    expect((await client.pet.findMany()).map((pet) => pet.name)).toEqual(["Tom"])
  })

  test("only when the other filters next to the unique key match too", async () => {
    const client = await createPrismaClient(data)

    await expect(client.user.delete({ where: { id: 2, uniqueField: "c" } })).rejects.toMatchObject({ code: "P2025" })
    expect(await client.user.deleteMany({ where: { id: 2, uniqueField: "c" } })).toEqual({ count: 0 })
    expect(await userIds(client)).toEqual([1, 2, 3])
  })

  test("a row that doesn't exist", async () => {
    const client = await createPrismaClient(data)

    await expect(client.user.delete({ where: { id: 4 } })).rejects.toMatchObject({ code: "P2025" })
    expect(await userIds(client)).toEqual([1, 2, 3])
  })

  test("one after another, with creates and updates in between", async () => {
    const client = await createPrismaClient(data)

    await client.user.delete({ where: { id: 1 } })
    await client.user.create({ data: { id: 4, uniqueField: "d" } })
    await client.user.update({ where: { uniqueField: "c" }, data: { uniqueField: "e" } })
    await client.user.delete({ where: { uniqueField: "e" } })
    await client.user.delete({ where: { id: 4 } })

    expect(await userIds(client)).toEqual([2])
    await expect(client.user.delete({ where: { uniqueField: "c" } })).rejects.toMatchObject({ code: "P2025" })
  })
})
