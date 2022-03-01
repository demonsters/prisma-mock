// @ts-nocheck

import createPrismaClient from '../src/'

describe('Nested', () => {

  test('create: create one-to-many', async () => {
    const client = await createPrismaClient({})
    // TODO: Check output
    const account = await client.account.create({
      data: {
        users: {
          create: {
            role: "USER"
          },
        }
      },
      include: {
        users: true
      }
    })
    const users = await client.user.findMany()
    expect(users.length).toBe(1)
    expect(account).toEqual(
      {
        id: 1,
        name: null,
        users: [{
          id: 1,
          accountId: 1,
          role: "USER",
          deleted: false,
          clicks: null
        }]
      }
    )
  })

  test('create: create one-to-one', async () => {
    const client = await createPrismaClient({})
    // TODO: Check output
    const user = await client.user.create({
      data: {
        role: "USER",
        account: {
          create: {

          },
        }
      },
      include: {
        account: true
      }
    })
    expect(user).toEqual(
      {
        id: 1,
        accountId: 1,
        role: "USER",
        deleted: false,
        clicks: null,
        account: {
          id: 1,
          name: null,
        }
      }
    )
  })

  test('create: create one-to-many (array)', async () => {
    const client = await createPrismaClient({})
    // TODO: Check output
    const account = await client.account.create({
      data: {
        users: {
          create: [{
            role: "USER",
          }, {
            role: "ADMIN",
          }],
        }
      },
      include: {
        users: true
      }
    })
    expect(account).toEqual(
      {
        id: 1,
        name: null,
        users: [{
          id: 1,
          role: "USER",
          accountId: 1,
          deleted: false,
          clicks: null,
        }, {
          id: 2,
          role: "ADMIN",
          accountId: 1,
          deleted: false,
          clicks: null,
        }]
      }
    )
  })
  test('create: createMany', async () => {
    const client = await createPrismaClient({
      answers: [],
      userAnswers: [],
      user: [
        { id: 1, role: "USER" }
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
    expect(answer).toEqual(
      {
        title: "Title",
        id: 1,
        users: [{
          answerId: 1,
          userId: 1,
          value: null,
          // userId_answerId: { answerId: 2, userId: 1 },
        }]
      }
    )
  })

  test('update: createMany', async () => {
    const client = await createPrismaClient({
      answers: [
        { id: 1, title: "Title" }
      ],
      userAnswers: [],
      user: [
        { id: 1, role: "USER" }
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


  test('update: updateMany', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, }
      ],
      stripe: {
        customerId: "1",
        accountId: 1,
      },
      user: [
        { id: 2, role: "ADMIN", accountId: 1 }
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
    expect(answer).toEqual(
      {
        id: 1,
        users: [{
          id: 2,
          accountId: 1,
          role: "USER"
        }]
      }
    )
  })


  test('update: update one-to-many', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, }
      ],
      stripe: {
        customerId: "1",
        accountId: 1,
      },
      user: [
        { id: 2, role: "ADMIN", accountId: 1 }
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
    expect(answer).toEqual(
      {
        id: 1,
        users: [{
          id: 2,
          accountId: 1,
          role: "USER"
        }]
      }
    )
  })

  test('update: update one-to-one', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      stripe: [{
        id: 2,
        accountId: 1,
      }],
    })
    // TODO: Check output
    const answer = await client.stripe.update({
      data: {
        account: {
          update: {
            name: "B"
          },
        }
      },
      where: {
        id: 2
      },
      include: {
        account: true
      }
    })
    expect(answer).toEqual(
      {
        id: 2,
        accountId: 1,
        account: {
          id: 1,
          name: "B"
        }
      }
    )
  })

})