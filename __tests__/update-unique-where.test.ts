// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// update finds the row a unique where points at through a lookup of where each value sits,
// which creates and updates carry forward. These move values around first, so the lookup
// has to follow the current rows
describe("update by a unique where", () => {
  test("finds a row by the unique value an earlier update gave it", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    await client.user.update({ where: { uniqueField: "a" }, data: { uniqueField: "b" } })

    const updated = await client.user.update({ where: { uniqueField: "b" }, data: { name: "B" } })

    expect(updated).toMatchObject({ id: 1, uniqueField: "b", name: "B" })
    await expect(client.user.update({ where: { uniqueField: "a" }, data: { name: "A" } })).rejects.toMatchObject({ code: "P2025" })
  })

  test("finds a row by the compound key an earlier update changed", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }] })
    await client.pet.create({ data: { id: 1, name: "Rex", ownerId: 1 } })
    await client.pet.update({ where: { name_ownerId: { name: "Rex", ownerId: 1 } }, data: { name: "Max" } })

    const updated = await client.pet.update({ where: { name_ownerId: { name: "Max", ownerId: 1 } }, data: { name: "Bo" } })

    expect(updated).toEqual({ id: 1, name: "Bo", ownerId: 1 })
    await expect(
      client.pet.update({ where: { name_ownerId: { name: "Rex", ownerId: 1 } }, data: { name: "Rex" } })
    ).rejects.toMatchObject({ code: "P2025" })
  })

  test("only updates when the other filters next to the unique key match too", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, name: "Henk", uniqueField: "u1" }] })

    await expect(client.user.update({ where: { id: 1, name: "Piet" }, data: { clicks: 1 } })).rejects.toMatchObject({ code: "P2025" })
    expect(await client.user.update({ where: { id: 1, name: "Henk" }, data: { clicks: 1 } })).toMatchObject({ id: 1, clicks: 1 })
  })

  test("finds rows created and deleted around it", async () => {
    const client = await createPrismaClient()
    await client.user.createMany({ data: [{ id: 1, uniqueField: "a" }, { id: 2, uniqueField: "b" }, { id: 3, uniqueField: "c" }] })
    await client.user.update({ where: { id: 1 }, data: { name: "first" } })
    await client.user.delete({ where: { id: 2 } })
    await client.user.create({ data: { id: 4, uniqueField: "d" } })

    expect(await client.user.update({ where: { id: 3 }, data: { name: "third" } })).toMatchObject({ id: 3, name: "third" })
    expect(await client.user.update({ where: { id: 4 }, data: { name: "fourth" } })).toMatchObject({ id: 4, name: "fourth" })
    const users = await client.user.findMany({ orderBy: { id: "asc" } })
    expect(users.map((user) => [user.id, user.name])).toEqual([[1, "first"], [3, "third"], [4, "fourth"]])
  })
})

describe("update by a unique where after changing the mock's internal state", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  test("finds a row pushed into the internal state", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    client.$getInternalState().user.push({ id: 2, uniqueField: "b" })

    expect(await client.user.update({ where: { id: 2 }, data: { name: "pushed" } })).toMatchObject({ id: 2, name: "pushed" })
  })
})
