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
