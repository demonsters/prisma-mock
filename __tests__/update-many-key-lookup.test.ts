// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// updateMany and updateManyAndReturn only match the rows holding the values a where pins an
// id, unique field, foreign key or compound key to. These check they change the same rows as
// matching the whole table would, and that later lookups by the old and new values agree
describe.each([true, false])("updateMany by a key (enableIndexes: %s)", (enableIndexes) => {
  const data = {
    user: [
      { id: 1, name: "Anna", uniqueField: "a" },
      { id: 2, name: "Bert", uniqueField: "b" },
    ],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
      { id: 3, name: "Max", ownerId: 2 },
    ],
    toy: [
      { id: 1, name: "ball", ownerId: 1 },
      { id: 2, name: "rope", ownerId: 2 },
      { id: 3, name: "bone", ownerId: 1 },
      { id: 4, name: "ball", ownerId: 3 },
      { id: 5, name: "rope", ownerId: 1 },
    ],
  }

  const ids = (rows) => rows.map((row) => row.id).sort((a, b) => a - b)

  const toys = async (client) =>
    (await client.toy.findMany({ orderBy: { id: "asc" } })).map(({ id, name, ownerId }) => ({ id, name, ownerId }))

  test("by a unique field", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.user.updateMany({ where: { uniqueField: "b" }, data: { name: "Bob" } })).toEqual({ count: 1 })
    const returned = await client.user.updateManyAndReturn({ where: { uniqueField: "a" }, data: { name: "Ann" } })

    expect(returned).toMatchObject([{ id: 1, name: "Ann" }])
    expect((await client.user.findMany({ orderBy: { id: "asc" } })).map((user) => user.name)).toEqual(["Ann", "Bob"])
  })

  test("by a foreign key", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.toy.updateMany({ where: { ownerId: 1 }, data: { name: "new" } })).toEqual({ count: 3 })
    const returned = await client.toy.updateManyAndReturn({ where: { ownerId: 3 }, data: { name: "newer" } })

    expect(returned).toMatchObject([{ id: 4, name: "newer" }])
    expect((await toys(client)).map((toy) => toy.name)).toEqual(["new", "rope", "new", "newer", "new"])
  })

  test("by in on a key", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.toy.updateMany({ where: { id: { in: [5, 1, 99] } }, data: { name: "new" } })).toEqual({ count: 2 })
    const returned = await client.toy.updateManyAndReturn({ where: { ownerId: { in: [2, 3] } }, data: { name: "newer" } })

    expect(ids(returned)).toEqual([2, 4])
    expect((await toys(client)).map((toy) => toy.name)).toEqual(["new", "newer", "bone", "newer", "new"])
  })

  test("by a key and another filter that leaves some of its rows out", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.toy.updateMany({ where: { ownerId: 1, name: { not: "rope" } }, data: { name: "new" } })).toEqual({ count: 2 })
    const returned = await client.toy.updateManyAndReturn({ where: { AND: [{ ownerId: 1 }, { name: "rope" }] }, data: { name: "newer" } })

    expect(returned).toMatchObject([{ id: 5, name: "newer" }])
    expect((await toys(client)).map((toy) => toy.name)).toEqual(["new", "rope", "new", "ball", "newer"])
  })

  test("by a where that matches nothing", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    const before = await toys(client)

    expect(await client.toy.updateMany({ where: { ownerId: 99 }, data: { name: "new" } })).toEqual({ count: 0 })
    expect(await client.toy.updateMany({ where: { id: 1, name: "rope" }, data: { name: "new" } })).toEqual({ count: 0 })
    expect(await client.toy.updateManyAndReturn({ where: { id: { in: [] } }, data: { name: "new" } })).toEqual([])

    expect(await toys(client)).toEqual(before)
  })

  test("moving rows to another foreign key value", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.toy.updateMany({ where: { ownerId: 1 }, data: { ownerId: 2 } })).toEqual({ count: 3 })

    expect(await client.toy.count({ where: { ownerId: 1 } })).toEqual(0)
    expect(ids(await client.toy.findMany({ where: { ownerId: 2 } }))).toEqual([1, 2, 3, 5])

    const returned = await client.toy.updateManyAndReturn({ where: { ownerId: 2, name: "rope" }, data: { ownerId: 1 } })

    expect(ids(returned)).toEqual([2, 5])
    expect(ids(await client.toy.findMany({ where: { ownerId: 1 } }))).toEqual([2, 5])
    expect(ids(await client.toy.findMany({ where: { ownerId: 2 } }))).toEqual([1, 3])
    expect(ids(await client.toy.findMany({ where: { ownerId: { in: [1, 3] } } }))).toEqual([2, 4, 5])
  })

  test("changing the unique field it looked the row up by", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.user.updateMany({ where: { uniqueField: "b" }, data: { uniqueField: "c" } })).toEqual({ count: 1 })

    expect(await client.user.findUnique({ where: { uniqueField: "b" } })).toEqual(null)
    expect(await client.user.findUnique({ where: { uniqueField: "c" } })).toMatchObject({ id: 2 })
    expect(await client.user.updateMany({ where: { uniqueField: "b" }, data: { name: "x" } })).toEqual({ count: 0 })

    const returned = await client.user.updateManyAndReturn({ where: { uniqueField: "c" }, data: { uniqueField: "b" } })

    expect(returned).toMatchObject([{ id: 2, uniqueField: "b" }])
    expect(await client.user.findUnique({ where: { uniqueField: "c" } })).toEqual(null)
    expect(await client.user.findUnique({ where: { uniqueField: "b" } })).toMatchObject({ id: 2 })
  })

  test("changing the id it looked the rows up by", async () => {
    const client = await createPrismaClient(data, { enableIndexes })

    expect(await client.toy.updateMany({ where: { id: { in: [4] } }, data: { id: 14 } })).toEqual({ count: 1 })

    expect(await client.toy.findUnique({ where: { id: 4 } })).toEqual(null)
    expect(await client.toy.findUnique({ where: { id: 14 } })).toMatchObject({ name: "ball", ownerId: 3 })
    expect(ids(await client.toy.findMany({ where: { ownerId: 3 } }))).toEqual([14])
  })
})

// What only the mock does, or only it does in a given order
describe.each([true, false])("updateMany by a key, mock only (enableIndexes: %s)", (enableIndexes) => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  const seed = async () => {
    const client = await createPrismaClient({
      user: [{ id: 1, uniqueField: "a" }, { id: 2, uniqueField: "b" }],
      pet: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }, { id: 3, name: "Rex", ownerId: 2 }],
    }, { enableIndexes })
    // Rows not in id order, so table order and id order differ
    await client.toy.createMany({
      data: [
        { id: 3, name: "bone", ownerId: 1 },
        { id: 1, name: "ball", ownerId: 1 },
        { id: 4, name: "rope", ownerId: 2 },
        { id: 2, name: "rope", ownerId: 1 },
      ],
    })
    return client
  }

  test("updateManyAndReturn returns the rows in table order", async () => {
    const client = await seed()

    const byForeignKey = await client.toy.updateManyAndReturn({ where: { ownerId: 1 }, data: { name: "new" } })
    const byIn = await client.toy.updateManyAndReturn({ where: { id: { in: [2, 4, 3] } }, data: { name: "newer" } })

    expect(byForeignKey.map((toy) => toy.id)).toEqual([3, 1, 2])
    expect(byIn.map((toy) => toy.id)).toEqual([3, 4, 2])
  })

  test("returns the same rows in the same order when a value is held by many rows", async () => {
    const client = await seed()
    // More rows than are looked up one by one, which are found in one pass over the table
    await client.toy.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({ id: 100 - i, name: `toy-${i}`, ownerId: 2 })),
    })
    const expected = (await client.toy.findMany({ where: { ownerId: 2 } })).map((toy) => toy.id)

    const returned = await client.toy.updateManyAndReturn({ where: { ownerId: 2 }, data: { ownerId: 3 } })

    expect(returned.map((toy) => toy.id)).toEqual(expected)
    expect(await client.toy.count({ where: { ownerId: 2 } })).toEqual(0)
    expect((await client.toy.findMany({ where: { ownerId: 3 } })).map((toy) => toy.id)).toEqual(expected)
  })

  // Prisma doesn't take a compound key in the where of updateMany, the mock does
  test("by a compound key, also when the update changes it", async () => {
    const client = await seed()

    expect(await client.pet.updateMany({ where: { name_ownerId: { name: "Rex", ownerId: 2 } }, data: { name: "Max" } })).toEqual({ count: 1 })
    expect(await client.pet.updateMany({ where: { name_ownerId: { name: "Rex", ownerId: 2 } }, data: { name: "Max" } })).toEqual({ count: 0 })

    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Rex", ownerId: 2 } } })).toEqual(null)
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Max", ownerId: 2 } } })).toMatchObject({ id: 3 })
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Rex", ownerId: 1 } } })).toMatchObject({ id: 1 })

    const returned = await client.pet.updateManyAndReturn({ where: { name_ownerId: { name: "Max", ownerId: 2 } }, data: { ownerId: 1 } })

    expect(returned).toMatchObject([{ id: 3, name: "Max", ownerId: 1 }])
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Max", ownerId: 2 } } })).toEqual(null)
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Max", ownerId: 1 } } })).toMatchObject({ id: 3 })
    expect(await client.pet.count({ where: { ownerId: 2 } })).toEqual(0)
  })

  test("a duplicate created after it moved a unique value is caught", async () => {
    const client = await seed()

    await client.user.updateMany({ where: { uniqueField: "b" }, data: { uniqueField: "c" } })

    await expect(client.user.create({ data: { id: 3, uniqueField: "c" } })).rejects.toMatchObject({ code: "P2002" })
    await client.user.create({ data: { id: 4, uniqueField: "b" } })
    expect(await client.user.findUnique({ where: { uniqueField: "b" } })).toMatchObject({ id: 4 })
  })
})
