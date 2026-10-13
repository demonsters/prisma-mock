// @ts-nocheck

import { Prisma } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

// A nested write on an existing row only reaches the rows related to it. Prisma refuses a
// nested delete of a row that isn't, and then leaves everything as it was, the write to the
// parent and the rest of the nested writes included
describe("nested writes only reach related rows", () => {
  const data = {
    account: [{ id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }],
    user: [
      { id: 1, uniqueField: "a", accountId: 1 },
      { id: 2, uniqueField: "b", accountId: 2 },
      { id: 3, uniqueField: "c" },
    ],
    pet: [
      { id: 1, name: "Rex", ownerId: 1 },
      { id: 2, name: "Max", ownerId: 2 },
      { id: 3, name: "Tom", ownerId: 1 },
    ],
    stripe: [
      { id: 1, accountId: 1, customerId: "c1" },
      { id: 2, accountId: 2, customerId: "c2" },
    ],
  }

  const state = async (client) => ({
    pets: (await client.pet.findMany({ orderBy: { id: "asc" } })).map((pet) => [pet.id, pet.name, pet.ownerId]),
    accounts: (await client.account.findMany({ orderBy: { id: "asc" } })).map((account) => [account.id, account.name]),
    stripes: (await client.stripe.findMany({ orderBy: { id: "asc" } })).map((stripe) => stripe.id),
    users: (await client.user.findMany({ orderBy: { id: "asc" } })).map((user) => [user.id, user.name, user.accountId]),
  })

  const updateUser = (client, id, pets) => client.user.update({ where: { id }, data: { name: "x", pets } })

  describe("delete on a list", () => {
    test("deletes a related row", async () => {
      const client = await createPrismaClient(data)

      await updateUser(client, 1, { delete: [{ id: 1 }, { id: 3 }] })

      expect((await state(client)).pets).toEqual([[2, "Max", 2]])
      expect((await state(client)).users[0]).toEqual([1, "x", 1])
    })

    test.each([
      ["a row related to another one", { id: 2 }],
      ["a row that doesn't exist", { id: 99 }],
      ["a related row the other filters leave out", { id: 1, name: "Nope" }],
      ["another one's row by a compound key", { name_ownerId: { name: "Max", ownerId: 2 } }],
      ["a related row next to one that isn't", [{ id: 1 }, { id: 2 }]],
    ])("refuses %s and changes nothing", async (_, where) => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await expect(updateUser(client, 1, { delete: where })).rejects.toMatchObject({ code: "P2017" })

      expect(await state(client)).toEqual(before)
    })

    test("refuses a where that isn't unique", async () => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await expect(updateUser(client, 1, { delete: { ownerId: 1 } })).rejects.toBeInstanceOf(Prisma.PrismaClientValidationError)

      expect(await state(client)).toEqual(before)
    })

    test("undoes the nested writes before the one refused", async () => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await expect(
        updateUser(client, 1, { create: { id: 4, name: "Bo" }, updateMany: { where: { name: "Rex" }, data: { name: "Renamed" } }, delete: { id: 2 } })
      ).rejects.toMatchObject({ code: "P2017" })

      expect(await state(client)).toEqual(before)
      expect(await client.pet.findUnique({ where: { id: 4 } })).toEqual(null)
      expect(await client.pet.count({ where: { ownerId: 1 } })).toEqual(2)
    })
  })

  describe("deleteMany and updateMany on a list", () => {
    test("deleteMany leaves the rows of another one", async () => {
      const client = await createPrismaClient(data)

      await updateUser(client, 1, { deleteMany: { name: "Max" } })
      expect((await state(client)).pets).toEqual([[1, "Rex", 1], [2, "Max", 2], [3, "Tom", 1]])

      await updateUser(client, 1, { deleteMany: [{ name: "Rex" }, { name: "Max" }] })
      expect((await state(client)).pets).toEqual([[2, "Max", 2], [3, "Tom", 1]])

      await updateUser(client, 1, { deleteMany: {} })
      expect((await state(client)).pets).toEqual([[2, "Max", 2]])
    })

    test("updateMany leaves the rows of another one", async () => {
      const client = await createPrismaClient(data)

      await updateUser(client, 1, { updateMany: { where: { name: "Max" }, data: { name: "H" } } })
      expect((await state(client)).pets).toEqual([[1, "Rex", 1], [2, "Max", 2], [3, "Tom", 1]])

      await updateUser(client, 1, { updateMany: [{ where: { name: "Rex" }, data: { name: "H" } }, { where: { name: "Max" }, data: { name: "H" } }] })
      expect((await state(client)).pets).toEqual([[1, "H", 1], [2, "Max", 2], [3, "Tom", 1]])
    })

    test("update leaves the rows of another one", async () => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await expect(updateUser(client, 1, { update: [{ where: { id: 2 }, data: { name: "H" } }] })).rejects.toMatchObject({ code: "P2025" })
      expect(await state(client)).toEqual(before)

      await updateUser(client, 1, { update: [{ where: { id: 3 }, data: { name: "H" } }] })
      expect((await state(client)).pets).toEqual([[1, "Rex", 1], [2, "Max", 2], [3, "H", 1]])
    })
  })

  describe("delete on a to-one relation", () => {
    test("held by this row: deletes the related row and clears the foreign key", async () => {
      const client = await createPrismaClient(data)

      await client.user.update({ where: { id: 1 }, data: { name: "x", account: { delete: true } } })

      const after = await state(client)
      expect(after.accounts.map(([id]) => id)).toEqual([2, 3])
      expect(after.users[0]).toEqual([1, "x", null])
      // Stripe cascades from Account
      expect(after.stripes).toEqual([2])
    })

    test("held by this row: by a filter the related row matches", async () => {
      const client = await createPrismaClient(data)

      await client.user.update({ where: { id: 1 }, data: { account: { delete: { name: "A" } } } })

      expect((await state(client)).accounts.map(([id]) => id)).toEqual([2, 3])
    })

    test("held by the related row: deletes it", async () => {
      const client = await createPrismaClient(data)

      await client.account.update({ where: { id: 1 }, data: { name: "x", stripe: { delete: true } } })

      const after = await state(client)
      expect(after.stripes).toEqual([2])
      expect(after.accounts[0]).toEqual([1, "x"])
    })

    test.each([
      ["nothing is related, held by this row", (client) => client.user.update({ where: { id: 3 }, data: { name: "x", account: { delete: true } } })],
      ["the related row doesn't match, held by this row", (client) => client.user.update({ where: { id: 1 }, data: { name: "x", account: { delete: { name: "B" } } } })],
      ["nothing is related, held by the related row", (client) => client.account.update({ where: { id: 3 }, data: { name: "x", stripe: { delete: true } } })],
      ["the related row doesn't match, held by the related row", (client) => client.account.update({ where: { id: 1 }, data: { name: "x", stripe: { delete: { customerId: "c2" } } } })],
    ])("refuses when %s, and changes nothing", async (_, operation) => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await expect(operation(client)).rejects.toMatchObject({ code: "P2025" })

      expect(await state(client)).toEqual(before)
    })

    test("false deletes nothing", async () => {
      const client = await createPrismaClient(data)
      const before = await state(client)

      await client.account.update({ where: { id: 1 }, data: { stripe: { delete: false } } })

      expect(await state(client)).toEqual(before)
    })
  })
})
