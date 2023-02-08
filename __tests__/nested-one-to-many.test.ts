// @ts-nocheck

import createPrismaClient from './createPrismaClient'

describe('Create', () => {

  test('create one-to-many', async () => {
    const client = await createPrismaClient({})
    // TODO: Check output
    const account = await client.account.create({
      data: {
        users: {
          create: {
            role: "USER",
            uniqueField: 'user',
          },
        }
      },
      include: {
        users: true
      }
    })
    const users = await client.user.findMany()
    expect(users.length).toBe(1)
    expect(account).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": null,
  "sort": null,
  "users": Array [
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": null,
      "role": "USER",
      "sort": null,
      "uniqueField": "user",
    },
  ],
}
`)
  })

  test('create one-to-many (array)', async () => {
    const client = await createPrismaClient({})
    // TODO: Check output
    const account = await client.account.create({
      data: {
        users: {
          create: [{
            role: "USER",
            uniqueField: 'user',
          }, {
            role: "ADMIN",
            uniqueField: 'admin',
          }],
        }
      },
      include: {
        users: true
      }
    })
    expect(account).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": null,
  "sort": null,
  "users": Array [
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": null,
      "role": "USER",
      "sort": null,
      "uniqueField": "user",
    },
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 2,
      "name": null,
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "admin",
    },
  ],
}
`)
  })

  test('createMany', async () => {
    const client = await createPrismaClient({
      answers: [],
      userAnswers: [],
      user: [
        { id: 1, role: "USER", uniqueField: 'user' }
      ]
    })
    // TODO: Check output
    const answer = await client.answers.create({
      data: {
        title: "Title",
        users: {
          createMany: {
            data: [{ userId: 1 }]
          },
        }
      },
      include: {
        users: true
      }
    })
    expect(answer).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "title": "Title",
  "users": Array [
    Object {
      "answerId": 1,
      "userId": 1,
      "value": null,
    },
  ],
}
`)
  })

})

describe("Update", () => {

  test('createMany', async () => {
    const client = await createPrismaClient({
      answers: [
        { id: 1, title: "Title" }
      ],
      userAnswers: [],
      user: [
        { id: 1, role: "USER", uniqueField: 'user' }
      ]
    })
    // TODO: Check output
    const answer = await client.answers.update({
      data: {
        users: {
          createMany: {
            data: [{ userId: 1 }]
          },
        }
      },
      where: { id: 1 },
      include: {
        users: true
      }
    })
    expect(answer).toEqual(
      {
        title: "Title",
        id: 1,
        users: [{
          answerId: 1,
          userId: 1,
          value: null
          // TODO:
          // userId_answerId: { answerId: 1, userId: 1 },
        }]
      }
    )
  })


  test('updateMany', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, }
      ],
      stripe: {
        customerId: "1",
        accountId: 1,
      },
      user: [
        { id: 2, role: "ADMIN", accountId: 1, uniqueField: 'user' }
      ]
    })
    // TODO: Check output
    const answer = await client.account.update({
      data: {
        users: {
          updateMany: [{
            data: {
              role: "USER"
            },
            where: {
              accountId: 1,
            }
          }]
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(answer).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": null,
  "sort": null,
  "users": Array [
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 2,
      "name": null,
      "role": "USER",
      "sort": null,
      "uniqueField": "user",
    },
  ],
}
`)
  })


  test('update', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, }
      ],
      stripe: [{
        customerId: "1",
        accountId: 1,
      }],
      user: [
        { id: 2, role: "ADMIN", accountId: 1, uniqueField: 'user' }
      ]
    })
    // TODO: Check output
    const answer = await client.account.update({
      data: {
        users: {
          update: [{
            data: {
              role: "USER"
            },
            where: {
              id: 2,
            }
          }]
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(answer).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": null,
  "sort": null,
  "users": Array [
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 2,
      "name": null,
      "role": "USER",
      "sort": null,
      "uniqueField": "user",
    },
  ],
}
`)
  })

  test("deleteMany array", async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      user: [{
        id: 2,
        accountId: 1,
        uniqueField: 'user1'
      }, {
        id: 3,
        accountId: 1,
        uniqueField: 'user2'
      }],
    })

    await client.account.update({
      data: {
        users: {
          // update: { where: { id: 2 }, data: { name: "Piet" } },
          deleteMany: [
            { id: 2 },
          ]
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    const account = await client.account.findUnique({
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(account.users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": 1,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": null,
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "user2",
  },
]
`)
  })

  test("deleteMany object", async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      user: [{
        id: 2,
        accountId: 1,
        uniqueField: 'user1'
      }, {
        id: 3,
        accountId: 1,
        uniqueField: 'user2'
      }],
    })

    await client.account.update({
      data: {
        users: {
          deleteMany:
            { id: 2 },
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    const account = await client.account.findUnique({
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(account.users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": 1,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": null,
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "user2",
  },
]
`)
  })

  test("delete array", async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      user: [{
        id: 2,
        accountId: 1,
        uniqueField: 'user1'
      }, {
        id: 3,
        accountId: 1,
        uniqueField: 'user2'
      }],
    })

    await client.account.update({
      data: {
        users: {
          // update: [{ where: {id: 1}, name: "Piet" }],
          delete: [
            { id: 2 },
          ]
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    const account = await client.account.findUnique({
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(account.users.length).toEqual(1)
    expect(account.users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": 1,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": null,
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "user2",
  },
]
`)
  })

  test("delete object", async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      user: [{
        id: 2,
        accountId: 1,
        uniqueField: 'user1'
      }, {
        id: 3,
        accountId: 1,
        uniqueField: 'user2'
      }],
    })

    await client.account.update({
      data: {
        users: {
          delete:
            { id: 2 },
        }
      },
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    const account = await client.account.findUnique({
      where: {
        id: 1
      },
      include: {
        users: true
      }
    })
    expect(account.users.length).toEqual(1)
    expect(account.users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": 1,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": null,
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "user2",
  },
]
`)
  })

})

test("Select", async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A", },
      { id: 2, name: "B", },
    ],
    user: [
      { id: 1, role: "USER", accountId: 1, deleted: true, uniqueField: 'user1' },
    ]
  })

  const accounts = await client.account.findMany({
    where: {
      users: { some: { deleted: true } }
    }
  })
  expect(accounts).toHaveLength(1)
  expect(accounts).toMatchInlineSnapshot(`
Array [
  Object {
    "id": 1,
    "name": "A",
    "sort": null,
  },
]
`)
})
