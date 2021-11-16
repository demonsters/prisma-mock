// @ts-nocheck

import mockPrismaClient from '../'
import { PrismaClient } from '@prisma/client'

const createPrismaClient = async (data): PrismaClient => {
  return await mockPrismaClient(data)
}


describe('PrismaClient', () => {

  const data = {
    user: [
      {
        id: 1,
        name: 'sadfsdf',
        accountId: 1,
        role: "ADMIN"
      }
    ],
    account: [
      {
        id: 1,
        name: 'sadfsdf',
      },
      {
        id: 2,
        name: 'adsfasdf2',
      }
    ]
  }

  test('findOne', async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.findUnique({
      where: {
        id: 1
      }
    })
    expect(user).toBe(data.user[0])
  })

  test('findOne by id', async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.findUnique({
      where: {
        id: 2
      }
    })
    expect(user).toBe(data.account[1])
  })

  test('findMany', async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.findMany()
    expect(accounts).toEqual(data.account)
  })

  test('findFirst', async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.findFirst()
    expect(accounts).toEqual(data.account[0])
  })

  test('count', async () => {
    const client = await createPrismaClient(data)
    const accounts = await client.account.count()
    expect(accounts).toEqual(2)
  })

  test('create', async () => {
    const client = await createPrismaClient(data)
    // TODO: Check output
    await client.user.create({
      data: {
        name: 'New user'
      }
    })
    const users = await client.user.findMany()

    expect(users).toEqual([
      ...data.user,
      {
        id: 2,
        name: 'New user',
        role: "ADMIN"
      }
    ])
  })

  test('create nested one-to-many', async () => {
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
        id: 2,
        users: [{
          id: 2,
          accountId: 2,
          role: "USER"
        }]
      }
    )
  })

  test('create nested many-yo-one', async () => {
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
        id: 2,
        accountId: 2,
        role: "USER",
        account: {
          id: 2,
        }
      }
    )
  })

  test('create nested createMany', async () => {
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
        id: 2,
        users: [{
          answerId: 2,
          userId: 1,
          // userId_answerId: { answerId: 2, userId: 1 },
        }]
      }
    )
  })

  test('update nested createMany', async () => {
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
          // TODO:
          // userId_answerId: { answerId: 1, userId: 1 },
        }]
      }
    )
  })


  test('update nested updateMany', async () => {
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


  test('update nested update', async () => {
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

  test('create connect', async () => {
    const client = await createPrismaClient(data)
    // TODO: Check output
    await client.user.create({
      data: {
        name: 'New user',
        account: { connect: { id: 1 } }
      }
    })
    const users = await client.user.findMany()

    expect(users).toEqual([
      ...data.user,
      {
        id: 2,
        name: 'New user',
        role: "ADMIN",
        accountId: 1,
      }
    ])
  })

  test('delete', async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.delete({
      where: {
        id: 2
      }
    })
    const users = await client.account.findMany()
    expect(users).toEqual([data.account[0]])
  })

  test('update', async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.update({
      where: {
        id: 2
      },
      data: {
        name: "New name"
      }
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      data.account[0],
      {
        id: 2,
        name: "New name"
      }
    ])
  })

  test('upsert update', async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.upsert({
      where: {
        id: 2
      },
      update: {
        name: "New name"
      }
    })
    const users = await client.account.findMany()
    expect(users).toEqual([
      data.account[0],
      {
        id: 2,
        name: "New name"
      }
    ])
  })

  test('upsert insert', async () => {
    const client = await createPrismaClient(data)
    const user = await client.account.upsert({
      where: {
        id: 3
      },
      create: {
        id: 3,
        name: "New name"
      }
    })
    const users = await client.account.findMany()
    users //?
    expect(users).toEqual([
      ...data.account,
      {
        id: 3,
        name: "New name"
      }
    ])
  })

  test.todo('connect')

})
