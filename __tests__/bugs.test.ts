// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

test("#22", async () => {
  const prismaMock = await createPrismaClient()

  // Create a page and user
  const user1 = await prismaMock.user.create({
    data: {
      uniqueField: "1",
    },
  })

  // Create a second page and user
  const user2 = await prismaMock.user.create({
    data: {
      uniqueField: "2",
    },
  })

  // Create a third page and user
  await prismaMock.user.create({
    data: {
      uniqueField: "3",
    },
  })

  // user3 blocks user2
  // If we comment this out it works as expected
  await prismaMock.element.create({
    data: {
      value: "1",
      user: {
        connect: {
          id: user1.id,
        },
      },
    },
  })

  // Check if user1 is blocked by user2
  const element = await prismaMock.element.findMany({
    where: {
      user: {
        id: user2.id,
      },
    },
    include: {
      user: true,
    },
  })

  expect(element).toMatchInlineSnapshot(`Array []`)
})

test("create returning null", async () => {
  const prismaMock = await createPrismaClient()

  const globalPlaylist = await prismaMock.stripe.create({
    data: {
      customerId: "cus_123",
      account: {
        create: {
          name: "Account",
        },
      },
      active: true,
      sort: 1,
    },
  })

  expect(globalPlaylist).not.toBeNull()
})

test("every in where", async () => {
  const prismaMock = await createPrismaClient()
  await prismaMock.user.create({
    data: {
      name: "John",
      uniqueField: "1",
      posts: {
        create: [
          { id: 1, title: "A" },
          { id: 2, title: "B" },
        ],
      },
    },
  })
  await prismaMock.user.create({
    data: {
      name: "Pieter",
      uniqueField: "2",
      posts: { create: [{ id: 3, title: "B" }] },
    },
  })
  await prismaMock.user.create({
    data: {
      name: "Sjors",
      uniqueField: "3",
      posts: { create: [{ id: 4, title: "C" }] },
    },
  })
  const users = await prismaMock.user.findMany({
    where: {
      posts: {
        every: {
          id: {
            in: [3, 2],
          },
        },
      },
    },
  })
  expect(users).toHaveLength(1)
  expect(users).toMatchInlineSnapshot(`
    Array [
      Object {
        "accountId": null,
        "age": 10,
        "clicks": null,
        "deleted": false,
        "id": 2,
        "name": "Pieter",
        "role": "ADMIN",
        "sort": null,
        "uniqueField": "2",
      },
    ]
  `)
})
