// @ts-nocheck

import { Prisma } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

// findUnique, findUniqueOrThrow, update and upsert take a WhereUniqueInput, as delete does, so
// Prisma rejects a where without an @id, @unique or compound key before it reads or writes
// anything
describe("a where without a unique key", () => {
  const data = {
    user: [
      { id: 1, name: "Anna", uniqueField: "a" },
      { id: 2, name: "Anna", uniqueField: "b" },
    ],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
      { id: 3, name: "Max", ownerId: 2 },
    ],
  }

  const pets = async (client) =>
    (await client.pet.findMany({ orderBy: { id: "asc" } })).map(({ id, name, ownerId }) => ({ id, name, ownerId }))

  const operations = [
    ["findUnique", (client, where) => client.pet.findUnique({ where })],
    ["findUniqueOrThrow", (client, where) => client.pet.findUniqueOrThrow({ where })],
    ["update", (client, where) => client.pet.update({ where, data: { name: "Bo" } })],
    ["upsert", (client, where) => client.pet.upsert({ where, update: { name: "Bo" }, create: { id: 4, name: "Bo", ownerId: 1 } })],
  ]

  describe.each(operations)("%s", (_, operation) => {
    test.each([
      ["a field that isn't unique", { name: "Rex" }],
      ["a foreign key", { ownerId: 1 }],
      ["an empty where", {}],
      ["a unique key that is undefined", { id: undefined, ownerId: 1 }],
      ["a unique key that is only inside AND", { AND: [{ id: 1 }] }],
    ])("rejects %s and leaves the table untouched", async (_, where) => {
      const client = await createPrismaClient(data)
      const before = await pets(client)

      await expect(operation(client, where)).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

      expect(await pets(client)).toEqual(before)
    })

    test.each([
      ["a unique field", { id: 2 }],
      ["a compound key", { name_ownerId: { name: "Tom", ownerId: 1 } }],
      ["a unique key with other filters next to it", { id: 2, ownerId: 1, name: { startsWith: "T" } }],
    ])("accepts %s", async (_, where) => {
      const client = await createPrismaClient(data)

      expect(await operation(client, where)).toMatchObject({ id: 2 })
    })
  })

  test("findUnique by a unique field of another model", async () => {
    const client = await createPrismaClient(data)

    expect(await client.user.findUnique({ where: { uniqueField: "b" } })).toMatchObject({ id: 2 })
    await expect(client.user.findUnique({ where: { name: "Anna" } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)
  })
})
