// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// With indexes enabled, a lookup by a foreign key answers from the rows indexed under that
// value. These change which rows hold a value, then check the lookup still matches the table
describe("lookups by a foreign key after writes", () => {
  const data = {
    user: [{ id: 1, uniqueField: "u1" }],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
    ],
  }

  const toyIds = async (client, ownerId) =>
    (await client.toy.findMany({ where: { ownerId }, orderBy: { id: "asc" } })).map((toy) => toy.id)

  test("a row moved to another value by update is only found under its new value", async () => {
    const client = await createPrismaClient(data)
    await client.toy.createMany({ data: [{ id: 1, name: "ball", ownerId: 1 }, { id: 2, name: "rope", ownerId: 1 }] })

    await client.toy.update({ where: { id: 1 }, data: { ownerId: 2 } })

    expect(await toyIds(client, 1)).toEqual([2])
    expect(await toyIds(client, 2)).toEqual([1])
  })

  test("rows moved to another value by updateMany are only found under their new value", async () => {
    const client = await createPrismaClient(data)
    await client.toy.createMany({ data: [{ id: 1, name: "ball", ownerId: 1 }, { id: 2, name: "rope", ownerId: 1 }, { id: 3, name: "bone", ownerId: 1 }] })

    await client.toy.updateMany({ where: { id: { in: [1, 3] } }, data: { ownerId: 2 } })

    expect(await toyIds(client, 1)).toEqual([2])
    expect(await toyIds(client, 2)).toEqual([1, 3])
  })

  test("deleting one of the rows sharing a value keeps the others", async () => {
    const client = await createPrismaClient(data)
    await client.toy.createMany({ data: [{ id: 1, name: "ball", ownerId: 1 }, { id: 2, name: "rope", ownerId: 1 }] })

    await client.toy.delete({ where: { id: 1 } })
    await client.toy.create({ data: { id: 3, name: "bone", ownerId: 1 } })

    expect(await toyIds(client, 1)).toEqual([2, 3])
  })

  test("deleteMany on some of the rows sharing a value keeps the others", async () => {
    const client = await createPrismaClient(data)
    await client.toy.createMany({ data: [{ id: 1, name: "ball", ownerId: 1 }, { id: 2, name: "rope", ownerId: 1 }, { id: 3, name: "bone", ownerId: 1 }] })

    await client.toy.deleteMany({ where: { id: { in: [1, 3] } } })

    expect(await toyIds(client, 1)).toEqual([2])
  })

  test("a rolled back transaction leaves the rows it moved under their old value", async () => {
    const client = await createPrismaClient(data)
    await client.toy.createMany({ data: [{ id: 1, name: "ball", ownerId: 1 }] })

    await expect(
      client.$transaction(async (tx) => {
        await tx.toy.update({ where: { id: 1 }, data: { ownerId: 2 } })
        throw new Error("rollback")
      })
    ).rejects.toThrow("rollback")

    expect(await toyIds(client, 1)).toEqual([1])
    expect(await toyIds(client, 2)).toEqual([])
  })
})

describe("lookups by a foreign key after replacing the mock's internal state", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  const toyIds = async (client, ownerId) =>
    (await client.toy.findMany({ where: { ownerId }, orderBy: { id: "asc" } })).map((toy) => toy.id)

  test("$setInternalState", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }], pet: [{ id: 1, name: "Rex", ownerId: 1 }] })
    await client.toy.create({ data: { id: 1, name: "ball", ownerId: 1 } })

    client.$setInternalState({ ...client.$getInternalState(), toy: [{ id: 2, name: "rope", ownerId: 1 }] })

    expect(await toyIds(client, 1)).toEqual([2])
  })

  test("$clear", async () => {
    const client = await createPrismaClient(undefined, { data: { user: [{ id: 1, uniqueField: "u1" }], pet: [{ id: 1, name: "Rex", ownerId: 1 }], toy: [] } })
    await client.toy.create({ data: { id: 1, name: "ball", ownerId: 1 } })

    client.$clear()

    expect(await toyIds(client, 1)).toEqual([])
  })
})
