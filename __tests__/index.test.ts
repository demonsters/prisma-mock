// @ts-nocheck

import { PrismaClient } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime"
import createPrismaClient from "./createPrismaClient"

describe("PrismaClient", () => {
  const data = {
    account: [
      {
        id: 1,
        name: "sadfsdf",
        sort: null,
      },
      {
        id: 2,
        name: "adsfasdf2",
        sort: null,
      },
    ],
    user: [
      {
        accountId: 1,
        clicks: null,
        deleted: false,
        name: "Admin",
        sort: null,
        role: "ADMIN",
        uniqueField: "first",
      },
    ],
  }

  test("findOne", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.findUnique({
      where: {
        id: 1,
      },
    })
    expect(user).toEqual({
      id: expect.any(Number),
      ...data.user[0],
    })
    await client.$disconnect()
  })

  test("findOne to", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.findUnique({
      where: {
        id: 1,
      },
      select: {
        id: true,
        account: true,
      },
    })
    expect(user).toEqual({
      id: expect.any(Number),
      account: {
        id: expect.any(Number),
        ...data.account[0],
      },
    })
    await client.$disconnect()
  })

  test("findOne by id", async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.findUnique({
      where: {
        id: 2,
      },
    })
    expect(user).toEqual({
      id: expect.any(Number),
      ...data.account[1],
    })
    await client.$disconnect()
  })

  test("findMany", async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.findMany()
    expect(accounts).toEqual(
      data.account.map((a) => ({ id: expect.any(Number), ...a }))
    )
  })

  test("findFirst", async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.findFirst()
    expect(accounts).toEqual({
      id: expect.any(Number),
      ...data.account[0],
    })
  })

  describe("findFirstOrThrow", () => {
    test("should succeed", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findFirstOrThrow({
        where: { id: 1 },
      })
      expect(accounts).toEqual(data.account[0])
    })

    test("should fail", async () => {
      const client = await createPrismaClient(data)
      try {
        const result = await client.account.findFirstOrThrow({
          where: { id: 0 },
        })
        throw new Error("Test should not reach here")
      } catch (e) {
        expect(e.message).toContain("No Account found")
      }
    })
  })

  describe("findUniqueOrThrow", () => {
    test("should succeed", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findUniqueOrThrow({
        where: { id: 1 },
      })
      expect(accounts).toEqual(data.account[0])
    })

    test("should fail", async () => {
      const client = await createPrismaClient(data)
      try {
        const result = await client.account.findUniqueOrThrow({
          where: { id: 0 },
        })
        throw new Error("Test should not reach here")
      } catch (e) {
        expect(e.message).toContain("No Account found")
      }
    })
  })

  test("count", async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.count()
    expect(accounts).toEqual(2)
  })

  test("create", async () => {
    const client = await createPrismaClient(data)
    // TODO: Check output
    await client.user.create({
      data: {
        name: "New user",
        sort: 1,
        uniqueField: "new",
      },
    })
    const users = await client.user.findMany()

    expect(users).toEqual([
      ...data.user.map((u) => ({ id: expect.any(Number), ...u })),
      {
        id: expect.any(Number),
        name: "New user",
        role: "ADMIN",
        deleted: false,
        clicks: null,
        sort: 1,
        accountId: null,
        uniqueField: "new",
      },
    ])
  })

  test("create connect", async () => {
    const client = await createPrismaClient(data)
    // TODO: Check output
    await client.user.create({
      data: {
        name: "New user",
        uniqueField: "new",
        sort: 1,
        account: { connect: { id: 1 } },
      },
    })
    const users = await client.user.findMany()

    expect(users).toEqual([
      ...data.user.map((u) => ({ id: expect.any(Number), ...u })),
      {
        id: expect.any(Number),
        name: "New user",
        role: "ADMIN",
        deleted: false,
        accountId: 1,
        clicks: null,
        sort: 1,
        uniqueField: "new",
      },
    ])
  })

  test("delete", async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.delete({
      where: {
        id: 2,
      },
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      {
        id: expect.any(Number),
        ...data.account[0],
      },
    ])
  })

  test("update", async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.update({
      where: {
        id: 2,
      },
      data: {
        name: "New name",
      },
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      {
        id: expect.any(Number),
        ...data.account[0],
      },
      {
        id: expect.any(Number),
        name: "New name",
        sort: null,
      },
    ])
  })

  test("upsert update", async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.upsert({
      where: {
        id: 2,
      },
      update: {
        name: "New name",
      },
      create: {},
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      {
        id: expect.any(Number),
        ...data.account[0],
      },
      {
        id: expect.any(Number),
        name: "New name",
        sort: null,
      },
    ])
  })

  test("upsert insert", async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.upsert({
      where: {
        id: 3,
      },
      create: {
        id: 3,
        name: "New name",
        sort: 1,
      },
      update: {},
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      ...data.account.map((u) => ({ id: expect.any(Number), ...u })),
      {
        id: expect.any(Number),
        name: "New name",
        sort: 1,
      },
    ])
  })

  test("connect implicit", async () => {
    const client = await createPrismaClient({})
    const account = await client.account.create({
      data: {
        id: 1,
        name: "New account",
      },
    })
    const user = await client.user.create({
      data: {
        name: "New user",
        guestOf: { connect: { id: 1 } },
        uniqueField: "new",
      },
    })
    const users = await client.user.findMany({
      include: {
        guestOf: true,
      },
    })

    expect(users).toEqual([
      {
        ...user,
        guestOf: [account],
      },
    ])
  })

  test("connect on secondary key", async () => {
    const client = await createPrismaClient(data)
    const element = await client.element.create({
      data: {
        value: "test element",
        user: {
          connect: { uniqueField: "first" },
        },
      },
    })
    const elements = await client.element.findMany({})

    expect(elements).toEqual([
      {
        e_id: 1,
        json: null,
        userId: 1,
        value: "test element",
      },
    ])
  })

  test("connect on secondary key with invalid value", async () => {
    const client = await createPrismaClient(data)

    await expect(
      client.element.create({
        data: {
          value: "test element",
          user: {
            connect: { uniqueField: "second" },
          },
        },
      })
    ).rejects.toThrow(
      PrismaClientKnownRequestError
      // new PrismaClientKnownRequestError(
      //   "An operation failed because it depends on one or more records that were required but not found. {cause}",
      //   "P2025",
      //   "1.2.3"
      // )
    )
  })
})
