// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// createMany appends its rows to one copy of the table made for the whole batch, updating
// what the delegate knows about the table as it goes. These check the rows of a batch are
// found, checked for duplicates and rolled back like rows created one at a time
describe.each([true, false])("createMany (enableIndexes: %s)", (enableIndexes) => {
  const owner = { user: [{ id: 1, uniqueField: "u1" }] }
  const ids = (rows) => rows.map((row) => row.id).sort((a, b) => a - b)

  test("rows created in one batch are found by id, unique field, compound key and foreign key", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    await client.pet.createMany({
      data: [
        { id: 1, name: "Rex", ownerId: 1 },
        { id: 2, name: "Tom", ownerId: 1 },
        { id: 3, name: "Max", ownerId: 1 },
      ],
    })

    expect(await client.pet.findUnique({ where: { id: 2 } })).toMatchObject({ name: "Tom" })
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Max", ownerId: 1 } } })).toMatchObject({ id: 3 })
    expect(ids(await client.pet.findMany({ where: { ownerId: 1 } }))).toEqual([1, 2, 3])
    expect(await client.pet.count({ where: { id: { in: [1, 3, 4] } } })).toBe(2)
  })

  test("a duplicate within the batch throws", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    await expect(
      client.pet.createMany({ data: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Rex", ownerId: 1 }] })
    ).rejects.toMatchObject({ code: "P2002" })
    await expect(
      client.user.createMany({ data: [{ id: 2, uniqueField: "u2" }, { id: 3, uniqueField: "u2" }] })
    ).rejects.toMatchObject({ code: "P2002" })
  })

  test("skipDuplicates skips duplicates within the batch and against existing rows", async () => {
    const client = await createPrismaClient({ ...owner, pet: [{ id: 1, name: "Rex", ownerId: 1 }] }, { enableIndexes })

    const { count } = await client.pet.createMany({
      data: [
        { id: 2, name: "Rex", ownerId: 1 },
        { id: 3, name: "Tom", ownerId: 1 },
        { id: 4, name: "Tom", ownerId: 1 },
      ],
      skipDuplicates: true,
    })

    expect(count).toBe(1)
    expect(ids(await client.pet.findMany())).toEqual([1, 3])
  })

  test("later writes see the rows of the batch", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    await client.pet.createMany({ data: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }] })

    await expect(client.pet.create({ data: { id: 3, name: "Tom", ownerId: 1 } })).rejects.toMatchObject({ code: "P2002" })
    expect(await client.pet.update({ where: { name_ownerId: { name: "Tom", ownerId: 1 } }, data: { name: "Max" } })).toMatchObject({ id: 2 })
    expect(await client.pet.delete({ where: { id: 1 } })).toMatchObject({ name: "Rex" })
    await client.pet.create({ data: { id: 3, name: "Rex", ownerId: 1 } })
    expect(ids(await client.pet.findMany({ where: { ownerId: 1 } }))).toEqual([2, 3])
  })

  test("createManyAndReturn returns the rows of the batch", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    const pets = await client.pet.createManyAndReturn({
      data: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }],
      select: { id: true, name: true },
    })
    expect(pets.sort((a, b) => a.id - b.id)).toEqual([{ id: 1, name: "Rex" }, { id: 2, name: "Tom" }])
  })

  test("a rolled back batch leaves nothing behind", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    await expect(
      client.$transaction(async (tx) => {
        await tx.pet.createMany({ data: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }] })
        throw new Error("rollback")
      })
    ).rejects.toThrow("rollback")

    expect(await client.pet.count()).toBe(0)
    expect(await client.pet.findMany({ where: { ownerId: 1 } })).toEqual([])
    await client.pet.createMany({ data: [{ id: 1, name: "Rex", ownerId: 1 }, { id: 2, name: "Tom", ownerId: 1 }] })
    expect(await client.pet.count()).toBe(2)
  })

  test("a nested createMany", async () => {
    const client = await createPrismaClient(owner, { enableIndexes })
    await client.user.create({
      data: { id: 2, uniqueField: "u2", pets: { createMany: { data: [{ id: 1, name: "Rex" }, { id: 2, name: "Tom" }] } } },
    })

    expect(ids(await client.pet.findMany({ where: { ownerId: 2 } }))).toEqual([1, 2])
    expect(await client.pet.findUnique({ where: { name_ownerId: { name: "Tom", ownerId: 2 } } })).toMatchObject({ id: 2 })
  })
})
