// @ts-nocheck

import { PrismaClientKnownRequestError } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

describe("Unique constraints", () => {
  test("single @unique - create duplicate throws P2002", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    try {
      await client.user.create({ data: { id: 2, uniqueField: "a" } })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("User")
      expect(e.meta.target).toEqual(["uniqueField"])
    }
  })

  test("single @unique - Stripe customerId duplicate throws P2002", async () => {
    const client = await createPrismaClient({
      account: [{ name: "a" }],
    })
    await client.stripe.create({
      data: { customerId: "cus_1", accountId: 1 },
    })
    try {
      await client.stripe.create({
        data: { customerId: "cus_1", accountId: 1 },
      })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("Stripe")
      expect(e.meta.target).toEqual(["customerId"])
    }
  })

  test("@id duplicate throws P2002", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    try {
      await client.user.create({ data: { id: 1, uniqueField: "b" } })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.target).toContain("id")
    }
  })

  test("createMany without skipDuplicates throws on duplicate", async () => {
    const client = await createPrismaClient()
    await expect(
      client.user.createMany({
        data: [
          { id: 1, uniqueField: "x" },
          { id: 2, uniqueField: "x" },
        ],
      })
    ).rejects.toThrow(PrismaClientKnownRequestError)
  })

  test("createMany with skipDuplicates ignores duplicate", async () => {
    const client = await createPrismaClient()
    const result = await client.user.createMany({
      data: [
        { id: 1, uniqueField: "y" },
        { id: 2, uniqueField: "y" },
        { id: 3, uniqueField: "z" },
      ],
      skipDuplicates: true,
    })
    expect(result.count).toBe(2)
    const users = await client.user.findMany({ orderBy: { id: "asc" } })
    expect(users).toHaveLength(2)
    expect(users.map((u) => u.uniqueField)).toEqual(["y", "z"])
  })

  test("@@unique - Element userId_value duplicate throws P2002", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }] })
    await client.element.create({ data: { userId: 1, value: "v1" } })
    try {
      await client.element.create({ data: { userId: 1, value: "v1" } })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("Element")
      expect(e.meta.target).toEqual(["userId", "value"])
    }
  })

  test("@@unique - Stripe accountId duplicate throws P2002", async () => {
    const client = await createPrismaClient({ account: [{ name: "a" }] })
    await client.stripe.create({
      data: { customerId: "c1", accountId: 1 },
    })
    try {
      await client.stripe.create({
        data: { customerId: "c2", accountId: 1 },
      })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("Stripe")
      expect(e.meta.target).toEqual(["accountId"])
    }
  })

  test("@@unique - Pet name_ownerId duplicate throws P2002", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }] })
    await client.pet.create({ data: { name: "Rex", ownerId: 1 } })
    try {
      await client.pet.create({ data: { name: "Rex", ownerId: 1 } })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("Pet")
      expect(e.meta.target).toEqual(["name", "ownerId"])
    }
  })
})

// A create looks duplicates up in the values the table held after the previous write. These
// change the table in other ways first, so the lookup has to reflect the current rows
describe("Unique constraints after other writes", () => {
  test("a value freed by update can be used again, and the new value is taken", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    await client.user.update({ where: { id: 1 }, data: { uniqueField: "b" } })

    await client.user.create({ data: { id: 2, uniqueField: "a" } })
    await expect(client.user.create({ data: { id: 3, uniqueField: "b" } })).rejects.toMatchObject({ code: "P2002" })
  })

  test("a value freed by delete can be used again", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    await client.user.delete({ where: { id: 1 } })

    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    expect(await client.user.count()).toBe(1)
  })

  test("a value from a rolled back transaction can be used again", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    await expect(
      client.$transaction(async (tx) => {
        await tx.user.create({ data: { id: 2, uniqueField: "b" } })
        throw new Error("rollback")
      })
    ).rejects.toThrow("rollback")

    await client.user.create({ data: { id: 2, uniqueField: "b" } })
    expect(await client.user.count()).toBe(2)
  })

  test("@@unique - a combination freed by update can be used again", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }] })
    await client.pet.create({ data: { id: 1, name: "Rex", ownerId: 1 } })
    await client.pet.update({ where: { id: 1 }, data: { name: "Max" } })

    await client.pet.create({ data: { id: 2, name: "Rex", ownerId: 1 } })
    await expect(client.pet.create({ data: { id: 3, name: "Max", ownerId: 1 } })).rejects.toMatchObject({ code: "P2002" })
  })
})

describe("Unique constraints after changing the mock's internal state", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  test("a value created before $clear can be used again", async () => {
    // Passed as initial data, so $clear brings back the very rows array the first create appended to
    const client = await createPrismaClient(undefined, { data: { user: [] } })
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    client.$clear()

    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    expect(await client.user.count()).toBe(1)
  })

  test("a row pushed into the internal state is taken into account", async () => {
    const client = await createPrismaClient()
    await client.user.create({ data: { id: 1, uniqueField: "a" } })
    client.$getInternalState().user.push({ id: 2, uniqueField: "b" })

    await expect(client.user.create({ data: { id: 3, uniqueField: "b" } })).rejects.toMatchObject({ code: "P2002" })
  })
})
