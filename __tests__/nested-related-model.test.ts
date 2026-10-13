// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

// A nested write runs on the related model's delegate, which has to resolve the compound
// keys and relations in its where against that model, not the parent's
describe("nested writes by a compound key of the related model", () => {
  const data = {
    user: [{ id: 1, uniqueField: "u1" }],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Tom", ownerId: 1 },
    ],
  }

  const petNames = async (client) =>
    (await client.pet.findMany({ orderBy: { id: "asc" } })).map((pet) => pet.name)

  test("update", async () => {
    const client = await createPrismaClient(data)

    await client.user.update({
      where: { id: 1 },
      data: {
        pets: {
          update: [{ where: { name_ownerId: { name: "Rex", ownerId: 1 } }, data: { name: "Max" } }],
        },
      },
    })

    expect(await petNames(client)).toEqual(["Max", "Tom"])
  })

  test("upsert updates the row the key points at", async () => {
    const client = await createPrismaClient(data)

    await client.user.update({
      where: { id: 1 },
      data: {
        pets: {
          upsert: {
            where: { name_ownerId: { name: "Rex", ownerId: 1 } },
            update: { name: "Max" },
            create: { name: "Rex" },
          },
        },
      },
    })

    expect(await petNames(client)).toEqual(["Max", "Tom"])
  })

  test("delete", async () => {
    const client = await createPrismaClient(data)

    await client.user.update({
      where: { id: 1 },
      data: {
        pets: {
          delete: { name_ownerId: { name: "Rex", ownerId: 1 } },
        },
      },
    })

    expect(await petNames(client)).toEqual(["Tom"])
  })
})
