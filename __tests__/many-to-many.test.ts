

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
          id: user.id
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
[
  {
    "name": "123",
    "participants": [
      {
        "accountId": 1,
        "age": 10,
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
[
  {
    "name": "123",
    "participants": [
      {
        "accountId": null,
        "age": 10,
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

test("set no record error", async () => {
  const prismaMock = await createPrismaClient()

  const { id } = await prismaMock.document.create({
    data: {
      name: "123",
    }
  })
  await expect(

    prismaMock.document.update({
      data: {
        name: "123",
        participants: {
          set: [{
            uniqueField: "1",
          }, {
            uniqueField: "2",
          }]
        }
      },
      select: {
        name: true,
        participants: true,
      },
      where: {
        id
      }
    })

  ).rejects.toThrow(
    Prisma.PrismaClientKnownRequestError
  )
})

test("set", async () => {

  const prismaMock = await createPrismaClient()

  const user1 = await prismaMock.user.create({
    data: {
      name: "123",
      uniqueField: "1"
    }
  })

  const user2 = await prismaMock.user.create({
    data: {
      name: "1234",
      uniqueField: "2",
    }
  })

  const { id } = await prismaMock.document.create({
    data: {
      name: "123",
    }
  })
  const document1 = await prismaMock.document.update({
    data: {
      name: "123",
      participants: {
        set: [{
          uniqueField: "1",
        }, {
          uniqueField: "2",
        }]
      }
    },
    select: {
      name: true,
      participants: true,
    },
    where: {
      id
    }
  })

  expect(document1).toMatchInlineSnapshot(`
{
  "name": "123",
  "participants": [
    {
      "accountId": null,
      "age": 10,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": "123",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "1",
    },
    {
      "accountId": null,
      "age": 10,
      "clicks": null,
      "deleted": false,
      "id": 2,
      "name": "1234",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "2",
    },
  ],
}
`)

  /// Override
  const document2 = await prismaMock.document.update({
    data: {
      name: "123",
      participants: {
        set: [{
          uniqueField: "1",
        }]
      }
    },
    select: {
      name: true,
      participants: true,
    },
    where: {
      id
    }
  })

  expect(document2).toMatchInlineSnapshot(`
{
  "name": "123",
  "participants": [
    {
      "accountId": null,
      "age": 10,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": "123",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "1",
    },
  ],
}
`)

  /// Override
  const document3 = await prismaMock.document.update({
    data: {
      name: "123",
      participants: {
        set: []
      }
    },
    select: {
      name: true,
      participants: true,
    },
    where: {
      id
    }
  })

  expect(document3).toMatchInlineSnapshot(`
{
  "name": "123",
  "participants": [],
}
`)
})



test("some in", async () => {
  // {
  //   user: [
  //     { id: 1, name: "A", uniqueField: "1" },
  //     { id: 2, name: "B", uniqueField: "2" },
  //   ],
  //   document: [
  //     { id: 1, name: "A" },
  //     { id: 2, name: "B" },
  //   ],
  // }
  const client = await createPrismaClient()
  await client.user.create({
    data:
      { name: "A", uniqueField: "1", documents: { create: { name: "A" } } },
  })
  await client.user.create({
    data: { name: "B", uniqueField: "2", documents: { create: { name: "B" } } },
  })

  const accounts = await client.user.findMany({
    where: {
      documents: {
        some: {
          name: {
            in: ["A", "B"],
          },
        },
      },
    },
  })
  expect(accounts).toMatchInlineSnapshot(`
[
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 1,
    "name": "A",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "1",
  },
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 2,
    "name": "B",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
]
`)
})


test("Should create many records", async () => {

  const prismaMock = await createPrismaClient()
  const user1 = await prismaMock.user.create({
    data: {
      name: "User 1",
      uniqueField: "1",
    }
  })
  const user2 = await prismaMock.user.create({
    data: {
      name: "User 2",
      uniqueField: "2",
    }
  })
  const answer = await prismaMock.answers.create({
    data: {
      title: "Test Workspace",
      users: {
        create: [
          {
            user: {
              connect: {
                id: user1.id
              }
            },
            value: "1"
          },
          {
            user: {
              connect: {
                id: user2.id
              }
            },
            value: "2"
          }
        ]
      }
    },
    include: {
      users: true
    }
  })
  expect(answer).toMatchInlineSnapshot(`
{
  "id": 1,
  "title": "Test Workspace",
  "users": [
    {
      "answerId": 1,
      "userId": 1,
      "value": "1",
    },
    {
      "answerId": 1,
      "userId": 2,
      "value": "2",
    },
  ],
}
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