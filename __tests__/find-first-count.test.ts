// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// findFirst and findUnique stop at the first matching row, and count counts matches without
// building rows, unless something orders or windows the result. These check both still
// answer what building every row would
describe.each([true, false])("findFirst and count (enableIndexes: %s)", (enableIndexes) => {
  const data = {
    user: [{ id: 1, uniqueField: "u1" }],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
    ],
    toy: [
      { id: 1, name: "b", ownerId: 1 },
      { id: 2, name: "a", ownerId: 2 },
      { id: 3, name: "c", ownerId: 1 },
      { id: 4, name: "a", ownerId: 1 },
    ],
  }

  test("findFirst returns the first match in table order", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.findFirst({ where: { name: "a" } })).toEqual({ id: 2, name: "a", ownerId: 2 })
    expect(await client.toy.findFirst({ where: { ownerId: 1 } })).toMatchObject({ id: 1 })
    expect(await client.toy.findFirst({ where: { name: "z" } })).toBeNull()
  })

  test("findFirst shapes the row it returns", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.findFirst({ where: { name: "a" }, select: { id: true } })).toEqual({ id: 2 })
    expect(await client.toy.findFirst({ where: { name: "a" }, include: { owner: true } })).toEqual({
      id: 2, name: "a", ownerId: 2, owner: { id: 2, name: "Tom", ownerId: 1 },
    })
  })

  test("findFirst with something ordering or windowing the result", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.findFirst({ where: { ownerId: 1 }, orderBy: { name: "desc" } })).toMatchObject({ id: 3 })
    expect(await client.toy.findFirst({ where: { ownerId: 1 }, orderBy: { id: "asc" }, skip: 1 })).toMatchObject({ id: 3 })
    expect(await client.toy.findFirst({ where: { name: "a" }, orderBy: { id: "desc" }, take: 1 })).toMatchObject({ id: 4 })
  })

  test("count", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.count()).toBe(4)
    expect(await client.toy.count({ where: { name: "a" } })).toBe(2)
    expect(await client.toy.count({ where: { ownerId: 1 }, orderBy: { name: "asc" } })).toBe(3)
    expect(await client.toy.count({ where: { name: "z" } })).toBe(0)
  })

  test("count with a window", async () => {
    const client = await createPrismaClient(data, { enableIndexes })
    expect(await client.toy.count({ where: { ownerId: 1 }, skip: 1 })).toBe(2)
    expect(await client.toy.count({ where: { ownerId: 1 }, take: 2 })).toBe(2)
    expect(await client.toy.count({ where: { ownerId: 1 }, orderBy: { id: "asc" }, cursor: { id: 3 } })).toBe(2)
  })
})
