// @ts-nocheck

import { PrismaClientValidationError } from "@prisma/client/runtime"
import createPrismaClient from "./createPrismaClient"


const data = {
  account: [
    {
      id: 1,
      name: "B",
    },
    {
      id: 2,
      name: "A",
    },
  ],
  user: [
    {
      id: 1,
      name: "sadfsdf",
      accountId: 1,
      uniqueField: "user",
    },
  ],
  stripe: [
    {
      id: 1,
      accountId: 1,
      customerId: "1"
    },
  ],
}

test("orderBy", async () => {
  const client = await createPrismaClient(data)
  const accounts = await client.account.findMany({
    orderBy: {
      name: "asc",
    }
  })
  expect(accounts).toEqual([
    expect.objectContaining({
      id: 2,
      name: "A",
    }),
    expect.objectContaining({
      id: 1,
      name: "B",
    }),
  ])
})



test("nested orderBy", async () => {
  const client = await createPrismaClient({

    account: [
      {
        id: 1,
        name: "B",
      },
      {
        id: 2,
        name: "A",
      },
    ],
    stripe: [
      {
        id: 1,
        accountId: 2,
        customerId: "2"
      },
      {
        id: 2,
        accountId: 1,
        customerId: "1"
      },
    ],
  })
  const accounts = await client.account.findMany({
    orderBy: {
      stripe: {
        id: "asc"
      },
    }
  })
  expect(accounts).toEqual([
    expect.objectContaining({
      id: 2,
      name: "A",
    }),
    expect.objectContaining({
      id: 1,
      name: "B",
    }),
  ])
})

test("Should throw error when more then one key in orderBy field", async () => {
  const client = await createPrismaClient({
    account: [
      {
        id: 1,
        name: "B",
      },
      {
        id: 2,
        name: "A",
      },
    ],
    stripe: [
      {
        id: 1,
        accountId: 2,
        customerId: "2",
      },
      {
        id: 2,
        accountId: 1,
        customerId: "1",
      },
    ],
  })

  await expect(client.stripe.findMany({
    orderBy: {
      account: {
        sort: "asc",
      },
      sort: "asc",
    }
  }))
  .rejects.toThrow(PrismaClientValidationError)
  // .rejects.toThrow(new PrismaClientValidationError('Argument orderBy of needs exactly one argument, but you provided account and sort. Please choose one.'))

})

test("Deep nested orderBy", async () => {
  const client = await createPrismaClient()
  await client.account.create({
    data: {
      name: "Account 1",
      sort: 1,
      users: {
        create: {
            name: "User 1",
            sort: 1,
            uniqueField: "user1",
            element: {
              create: [
                {
                  value: "2"
                },
                {
                  value: "1"
                }
              ]
            }
          },
      }
    },
  })
  await client.account.create({
    data: {
      name: "Account 2",
      sort: 2,
      users: {
        create: [
          {
            name: "User 2",
            sort: 1,
            uniqueField: "user2",
            element: {
              create: [
                {
                  value: "Element 3",
                }
              ]
            }
          },
        ]
      }
    }
  })
  const users = await client.element.findMany({
    orderBy: [
      // {
      //   user: {
      //     nonExisingField: {
      //       value: {
      //         sort: "asc"
      //       }
      //     }
      //   }
      // },
      {
        user: {
          account: {
            sort: "asc"
          },
        }
      },
      {
        user: {
          sort: "asc",
        }
      },
    ]
  })
  expect(users).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 1,
    "json": null,
    "userId": 1,
    "value": "2",
  },
  Object {
    "e_id": 2,
    "json": null,
    "userId": 1,
    "value": "1",
  },
  Object {
    "e_id": 3,
    "json": null,
    "userId": 2,
    "value": "Element 3",
  },
]
`)
});

