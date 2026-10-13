// @ts-nocheck

import { Prisma } from "@prisma/client"
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

// delete takes a WhereUniqueInput, so Prisma rejects a where without an @id, @unique or
// compound key before it deletes anything
describe("delete without a unique where", () => {
  const data = {
    user: [
      { id: 1, name: "Anna", uniqueField: "a" },
      { id: 2, name: "Anna", uniqueField: "b" },
      { id: 3, name: "Anna", uniqueField: "c" },
    ],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
      { id: 3, name: "Max", ownerId: 2 },
    ],
  }

  const petIds = async (client) =>
    (await client.pet.findMany({ orderBy: { id: "asc" } })).map((pet) => pet.id)

  test("rejects a field that isn't unique", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: { name: "Rex" } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    expect(await petIds(client)).toEqual([1, 2, 3])
  })

  test("rejects a foreign key", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: { ownerId: 1 } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    expect(await petIds(client)).toEqual([1, 2, 3])
  })

  test("rejects an empty where", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: {} })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    expect(await petIds(client)).toEqual([1, 2, 3])
  })

  test("rejects a unique key that is undefined", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: { id: undefined, ownerId: 1 } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    expect(await petIds(client)).toEqual([1, 2, 3])
  })

  test("rejects a unique key that is only inside AND", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: { AND: [{ id: 1 }] } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    expect(await petIds(client)).toEqual([1, 2, 3])
  })

  test("accepts a unique field", async () => {
    const client = await createPrismaClient(data)

    await client.user.delete({ where: { uniqueField: "c" } })

    expect((await client.user.findMany({ orderBy: { id: "asc" } })).map((user) => user.id)).toEqual([1, 2])
  })

  test("accepts a compound key", async () => {
    const client = await createPrismaClient(data)

    const deleted = await client.pet.delete({ where: { name_ownerId: { name: "Tom", ownerId: 1 } } })

    expect(deleted).toMatchObject({ id: 2 })
    expect(await petIds(client)).toEqual([1, 3])
  })

  test("accepts a unique key with other filters next to it", async () => {
    const client = await createPrismaClient(data)

    await expect(client.pet.delete({ where: { id: 1, ownerId: 2 } })).rejects.toMatchObject({ code: "P2025" })
    const deleted = await client.pet.delete({ where: { id: 1, ownerId: 1, name: { startsWith: "R" } } })

    expect(deleted).toMatchObject({ id: 1 })
    expect(await petIds(client)).toEqual([2, 3])
  })

  test("accepts the field of a single-field @@id or @@unique", async () => {
    const client = await createPrismaClient({
      account: [{ id: 1 }, { id: 2 }],
      stripe: [{ id: 1, accountId: 1, customerId: "c1" }, { id: 2, accountId: 2, customerId: "c2" }],
      slug: [{ slug: "a", title: "A" }, { slug: "b", title: "B" }],
    })

    await client.stripe.delete({ where: { accountId: 2 } })
    await client.slug.delete({ where: { slug: "a" } })

    expect((await client.stripe.findMany()).map((stripe) => stripe.id)).toEqual([1])
    expect((await client.slug.findMany()).map((slug) => slug.slug)).toEqual(["b"])
  })
})
