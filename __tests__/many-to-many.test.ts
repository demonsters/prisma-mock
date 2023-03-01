

import { Prisma } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

test("Select", async () => {

  const prismaMock = await createPrismaClient()

  const user = await prismaMock.user.create({
    data: {
      uniqueField: "1",
    }
  })

  const account = await prismaMock.account.create({
    data: {
      users: {
        connect: {
          id: user.id
        },
      },
    },
    include: {
      users: true,
    }
  })

  const document = await prismaMock.document.create({
    data: {
      name: "123",
      participants: {
        connect: {
          id: account.id
        }
      }
    }
  })

  const documents = await prismaMock.document.findMany({
    where: {
      participants: {
        some: {
          account: {
            id: account.id
          }
        }
      }
    },
    select: {
      name: true,
      participants: true
    },
  })

  // This is 0 when it should be 1
  expect(documents.length).toBe(1)
  expect(documents).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "123",
    "participants": Array [
      Object {
        "accountId": 1,
        "clicks": null,
        "deleted": false,
        "id": 1,
        "name": null,
        "role": "ADMIN",
        "sort": null,
        "uniqueField": "1",
      },
    ],
  },
]
`)

})

test("Create", async () => {

  const prismaMock = await createPrismaClient()

  const document = await prismaMock.document.create({
    data: {
      name: "123",
      participants: {
        create: {
          uniqueField: "1",
        }
      }
    }
  })

  const documents = await prismaMock.document.findMany({
    select: {
      name: true,
      participants: true
    },
  })

  // This is 0 when it should be 1
  expect(documents.length).toBe(1)
  expect(documents[0].participants.length).toBe(1)
  expect(documents).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "123",
    "participants": Array [
      Object {
        "accountId": null,
        "clicks": null,
        "deleted": false,
        "id": 1,
        "name": null,
        "role": "ADMIN",
        "sort": null,
        "uniqueField": "1",
      },
    ],
  },
]
`)

})

xtest("connectOrCreate create", async () => {

  const prismaMock = await createPrismaClient()

  const document = await prismaMock.document.create({
    data: {
      name: "123",
      participants: {
        connectOrCreate: {
          create: {
            uniqueField: "1",
          },
          where: {
            uniqueField: "1",
          }
        }
      }
    }
  })

  const documents = await prismaMock.document.findMany({
    select: {
      name: true,
      participants: true
    },
  })

  // This is 0 when it should be 1
  expect(documents.length).toBe(1)
  expect(documents[0].participants.length).toBe(1)
  expect(documents).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "123",
    "participants": Array [
      Object {
        "accountId": null,
        "clicks": null,
        "deleted": false,
        "id": 1,
        "name": null,
        "role": "ADMIN",
        "sort": null,
        "uniqueField": "1",
      },
    ],
  },
]
`)

})