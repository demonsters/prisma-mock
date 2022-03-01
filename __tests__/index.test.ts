// @ts-nocheck

import createPrismaClient from '../src/'

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
        role: "ADMIN",
        deleted: false,
        clicks: null,
        accountId: null
      }
    ])
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
        deleted: false,
        accountId: 1,
        clicks: null
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
    expect(users).toEqual([
      ...data.account,
      {
        id: 3,
        name: "New name"
      }
    ])
  })

  test('connect implicit', async () => {
    const client = await createPrismaClient({})
    const account = await client.account.create({
      data: {
        id: 1,
        name: 'New account',
      }
    })
    const user = await client.user.create({
      data: {
        name: 'New user',
        guestOf: { connect: { id: 1 } }
      }
    })
    const users = await client.user.findMany({
      include: {
        guestOf: true
      }
    })

    expect(users).toEqual([
      {
        ...user,
        guestOf: [ account ]
      }
    ])
  })

  test("autoincoment", async () => {
    const client = await createPrismaClient({})
    const user = await client.user.create({
      data: {
        name: 'New user',
      }
    })
    expect(user.id).toBe(1)
    await client.user.delete({
      where: {
        id: user.id
      }
    })
    const user2 = await client.user.create({
      data: {
        name: 'New user 2',
      }
    })
    expect(user2.id).toBe(2)
  })

})
