// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// A where clause pinning an id, unique or foreign key field to a value (plainly, with equals
// or with in) is answered from the index when indexes are enabled, and from the rows the
// delegate files by value otherwise, misses included. These check both return what matching
// every row would
describe.each([true, false])("lookups answered without matching every row (enableIndexes: %s)", (enableIndexes) => {
  const data = {
    user: [
      { id: 1, uniqueField: "Alpha", accountId: null },
      { id: 2, uniqueField: "beta" },
    ],
    pet: [
      { id: 0, name: "Zero", ownerId: 1 },
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 2 },
    ],
    toy: [
      { id: 1, name: "ball", ownerId: 1 },
      { id: 2, name: "rope", ownerId: 2 },
      { id: 3, name: "bone", ownerId: 1 },
      { id: 4, name: "stick", ownerId: 0 },
    ],
  }

  const ids = (rows) => rows.map((row) => row.id).sort((a, b) => a - b)

  test("equals", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.toy.findMany({ where: { ownerId: { equals: 1 } } }))).toEqual([1, 3])
    expect(ids(await client.toy.findMany({ where: { id: { equals: 2 } } }))).toEqual([2])
  })

  test("in", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.toy.findMany({ where: { id: { in: [3, 1, 3, 99] } } }))).toEqual([1, 3])
    expect(ids(await client.toy.findMany({ where: { ownerId: { in: [2, 0] } } }))).toEqual([2, 4])
    expect(await client.toy.findMany({ where: { id: { in: [] } } })).toEqual([])
  })

  test("other filters next to the indexed one narrow the rows down", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.toy.findMany({ where: { ownerId: 1, name: { startsWith: "bo" } } }))).toEqual([3])
    expect(ids(await client.toy.findMany({ where: { ownerId: { in: [1, 2], not: 2 } } }))).toEqual([1, 3])
    expect(ids(await client.toy.findMany({ where: { AND: [{ ownerId: 1 }, { name: "ball" }] } }))).toEqual([1])
  })

  test("values that no row holds", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.findUnique({ where: { id: 99 } })).toBeNull()
    expect(await client.toy.findMany({ where: { ownerId: 99 } })).toEqual([])
    expect(await client.toy.findMany({ where: { ownerId: { equals: 99 } } })).toEqual([])
  })

  test("falsy values", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.toy.findMany({ where: { ownerId: 0 } }))).toEqual([4])
    expect((await client.pet.findUnique({ where: { id: 0 } })).name).toEqual("Zero")
  })

  test("null, which also matches rows without the field", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.user.findMany({ where: { accountId: null } }))).toEqual([1, 2])
  })

  test("case insensitive filters", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(ids(await client.user.findMany({ where: { uniqueField: { equals: "alpha", mode: "insensitive" } } }))).toEqual([1])
    expect(ids(await client.user.findMany({ where: { uniqueField: { in: ["ALPHA", "BETA"], mode: "insensitive" } } }))).toEqual([1, 2])
  })
})

describe.each([true, false])("lookups answered without matching every row, mock only (enableIndexes: %s)", (enableIndexes) => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  test("come back in table order", async () => {
    const client = await createPrismaClient({
      user: [{ id: 1, uniqueField: "u1" }],
      pet: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }],
      toy: [{ id: 1, name: "ball", ownerId: 2 }, { id: 2, name: "rope", ownerId: 1 }, { id: 3, name: "bone", ownerId: 1 }],
    }, { enableIndexes })
    await client.toy.update({ where: { id: 1 }, data: { ownerId: 1 } })

    expect((await client.toy.findMany({ where: { id: { in: [3, 1, 2] } } })).map((toy) => toy.id)).toEqual([1, 2, 3])
    expect((await client.toy.findMany({ where: { ownerId: 1 } })).map((toy) => toy.id)).toEqual([1, 2, 3])
  })

  test("many rows sharing a value, found, updated and deleted in table order", async () => {
    const toys = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, name: `toy-${i + 1}`, ownerId: (i % 2) + 1 }))
    const client = await createPrismaClient({
      user: [{ id: 1, uniqueField: "u1" }],
      pet: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }],
      toy: toys,
    }, { enableIndexes })
    const ownedBy = (ownerId) => toys.filter((toy) => toy.ownerId === ownerId).map((toy) => toy.id)

    expect((await client.toy.findMany({ where: { ownerId: 1 } })).map((toy) => toy.id)).toEqual(ownedBy(1))
    await client.toy.update({ where: { ownerId: 2, id: 2 }, data: { name: "moved" } })
    expect(await client.toy.count({ where: { ownerId: 2, name: "moved" } })).toBe(1)
    expect(await client.toy.deleteMany({ where: { ownerId: 1 } })).toEqual({ count: 20 })
    expect((await client.toy.findMany()).map((toy) => toy.id)).toEqual(ownedBy(2))
  })

  test("find rows pushed straight into the internal state", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }], pet: [{ id: 1, name: "Rex", ownerId: 1 }] }, { enableIndexes })
    await client.toy.create({ data: { id: 1, name: "ball", ownerId: 1 } })
    client.$getInternalState().toy.push({ id: 2, name: "rope", ownerId: 1 })

    expect((await client.toy.findMany({ where: { ownerId: 1 } })).map((toy) => toy.id)).toEqual([1, 2])
    expect((await client.toy.findUnique({ where: { id: 2 } })).name).toEqual("rope")
  })

  test("the caseInsensitive option", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "Alpha" }] }, { caseInsensitive: true, enableIndexes })
    expect((await client.user.findMany({ where: { uniqueField: { equals: "alpha" } } })).map((user) => user.id)).toEqual([1])
    expect((await client.user.findMany({ where: { uniqueField: { in: ["ALPHA"] } } })).map((user) => user.id)).toEqual([1])
  })
})
