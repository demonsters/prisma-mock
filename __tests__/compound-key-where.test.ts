// @ts-nocheck

import { Prisma } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

// A compound key's name (name_ownerId) only exists at the top level of a WhereUniqueInput.
// Prisma rejects it anywhere else, before it reads or writes anything
describe("a compound key outside a unique where", () => {
  const data = {
    user: [
      { id: 1, uniqueField: "a" },
      { id: 2, uniqueField: "b" },
    ],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
      { id: 3, name: "Rex", ownerId: 2 },
    ],
  }

  const compoundKey = { name_ownerId: { name: "Rex", ownerId: 1 } }

  const pets = async (client) =>
    (await client.pet.findMany({ orderBy: { id: "asc" } })).map(({ id, name, ownerId }) => ({ id, name, ownerId }))

  test.each([
    ["deleteMany", (client, where) => client.pet.deleteMany({ where })],
    ["updateMany", (client, where) => client.pet.updateMany({ where, data: { name: "Bo" } })],
    ["updateManyAndReturn", (client, where) => client.pet.updateManyAndReturn({ where, data: { name: "Bo" } })],
    ["findMany", (client, where) => client.pet.findMany({ where })],
    ["findFirst", (client, where) => client.pet.findFirst({ where })],
    ["findFirstOrThrow", (client, where) => client.pet.findFirstOrThrow({ where })],
    ["count", (client, where) => client.pet.count({ where })],
    ["aggregate", (client, where) => client.pet.aggregate({ where, _count: { id: true } })],
    ["groupBy", (client, where) => client.pet.groupBy({ by: ["ownerId"], where })],
  ])("%s rejects it and leaves the table untouched", async (_, operation) => {
    const client = await createPrismaClient(data)
    const before = await pets(client)

    await expect(operation(client, compoundKey)).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

    expect(await pets(client)).toEqual(before)
  })

  test.each([
    ["AND", { AND: [compoundKey] }],
    ["OR", { OR: [compoundKey] }],
    ["NOT", { NOT: compoundKey }],
  ])("deleteMany rejects it inside %s", async (_, where) => {
    const client = await createPrismaClient(data)
    const before = await pets(client)

    await expect(client.pet.deleteMany({ where })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

    expect(await pets(client)).toEqual(before)
  })

  test("in a relation filter", async () => {
    const client = await createPrismaClient(data)

    await expect(client.user.findMany({ where: { pets: { some: compoundKey } } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    await expect(client.user.count({ where: { pets: { none: compoundKey } } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
  })

  test("in a nested deleteMany", async () => {
    const client = await createPrismaClient(data)
    const before = await pets(client)

    await expect(
      client.user.update({ where: { id: 1 }, data: { pets: { deleteMany: compoundKey } } })
    ).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

    expect(await pets(client)).toEqual(before)
  })

  test("inside AND of a unique where, next to the same key at its top level", async () => {
    const client = await createPrismaClient(data)
    const before = await pets(client)

    await expect(
      client.pet.update({ where: { ...compoundKey, AND: [compoundKey] }, data: { name: "Bo" } })
    ).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
    await expect(client.pet.delete({ where: { id: 1, OR: [compoundKey] } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

    expect(await pets(client)).toEqual(before)
  })

  test("the fields of a compound key can be used one by one", async () => {
    const client = await createPrismaClient(data)

    expect(await client.pet.count({ where: { name: "Rex", ownerId: 1 } })).toEqual(1)
    expect(await client.pet.updateMany({ where: { name: "Rex", ownerId: 1 }, data: { name: "Bo" } })).toEqual({ count: 1 })
    expect(await client.pet.deleteMany({ where: { AND: [{ name: "Bo" }, { ownerId: 1 }] } })).toEqual({ count: 1 })
    expect((await pets(client)).map((pet) => pet.id)).toEqual([2, 3])
  })

  test("at the top level of a unique where it still selects the row", async () => {
    const client = await createPrismaClient(data)

    expect(await client.pet.findUnique({ where: compoundKey })).toMatchObject({ id: 1 })
    expect(await client.pet.update({ where: compoundKey, data: { name: "Bo" } })).toMatchObject({ id: 1, name: "Bo" })
  })
})
