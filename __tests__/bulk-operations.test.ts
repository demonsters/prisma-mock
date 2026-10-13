// @ts-nocheck

import createPrismaClient from './createPrismaClient'

describe("bulk-operations", () => {
  const data = {
    user: [
      { name: 'Henk', clicks: 2, uniqueField: '1' },
      { name: 'Piet', clicks: 5, uniqueField: '2' },
    ]
  }

  test("updateMany", async () => {
    const client = await createPrismaClient(data)
    const { count } = await client.user.updateMany({
      where: {
        clicks: {
          gt: 4
        },
      },
      data: {
        name: 'Bard'
      }
    })

    const users = await client.user.findMany();
    expect(users[0].name).toEqual('Henk');
    expect(users[1].name).toEqual('Bard');
    expect(count).toEqual(1)

    await client.$disconnect()
  })

  test("deleteMany", async () => {
    const client = await createPrismaClient(data)
    const { count } = await client.user.deleteMany({
      where: {
        clicks: {
          gt: 4
        },
      },
    })

    const users = await client.user.findMany();
    expect(users.length).toBe(1);
    expect(count).toEqual(1)

    await client.$disconnect()
  })

  test("createMany", async () => {
    const client = await createPrismaClient(data)
    const { count } = await client.user.createMany({
      data: [
        { name: 'Plaf', clicks: 4, uniqueField: '4' },
        { name: 'Klof', clicks: 2, uniqueField: '5' },
        { name: "Klof", clicks: 3, uniqueField: "4" }
      ],
      skipDuplicates: true,
    })

    const users = await client.user.findMany();
    expect(users.length).toBe(4);
    expect(count).toEqual(2)

    const klof = users.find(u => u.name === 'Klof')
    expect(klof.uniqueField).toEqual('5')

    await client.$disconnect()
  })

  test("createManyAndReturn", async () => {
    const client = await createPrismaClient(data)
    const users = await client.user.createManyAndReturn({
      data: [
        { name: 'Plaf', clicks: 4, uniqueField: '4' },
        { name: 'Klof', clicks: 2, uniqueField: '5' },
      ],
    })
    expect(users.length).toBe(2)
    expect(users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": null,
    "age": 10,
    "clicks": 4,
    "deleted": false,
    "id": 3,
    "name": "Plaf",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "4",
  },
  Object {
    "accountId": null,
    "age": 10,
    "clicks": 2,
    "deleted": false,
    "id": 4,
    "name": "Klof",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "5",
  },
]
`)
  })


  test("updateManyAndReturn", async () => {
    const client = await createPrismaClient(data)
    const users = await client.user.updateManyAndReturn({
      where: {
        clicks: {
          gt: 4
        },
      },
      data: {
        name: 'Bard'
      }
    })
    expect(users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": null,
    "age": 10,
    "clicks": 5,
    "deleted": false,
    "id": 2,
    "name": "Bard",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
]
`)
  })


  test("updateManyAndReturn on a compound @@id returns only the updated rows", async () => {
    const client = await createPrismaClient({
      user: [
        { id: 1, name: "Henk", uniqueField: "1" },
        { id: 2, name: "Piet", uniqueField: "2" },
      ],
      answers: [
        { id: 1, title: "first" },
        { id: 2, title: "second" },
      ],
      userAnswers: [
        { userId: 1, answerId: 1, value: "open" },
        { userId: 1, answerId: 2, value: "closed" },
        { userId: 2, answerId: 1, value: "open" },
        { userId: 2, answerId: 2, value: "closed" },
      ],
    })
    const rows = await client.userAnswers.updateManyAndReturn({
      where: { value: "open" },
      data: { value: "answered" },
    })
    rows.sort((a, b) => a.userId - b.userId || a.answerId - b.answerId)
    expect(rows).toEqual([
      { userId: 1, answerId: 1, value: "answered" },
      { userId: 2, answerId: 1, value: "answered" },
    ])
  })

  test("updateManyAndReturn includes relations of the updated rows", async () => {
    const client = await createPrismaClient({
      user: [{ id: 1, name: "Henk", uniqueField: "1" }],
      pet: [
        { id: 1, name: "Rex", ownerId: 1 },
        { id: 2, name: "Tom", ownerId: 1 },
      ],
      toy: [
        { id: 1, name: "ball", ownerId: 1 },
        { id: 2, name: "rope", ownerId: 2 },
        { id: 3, name: "bone", ownerId: 1 },
      ],
    })
    const toys = await client.toy.updateManyAndReturn({
      where: { ownerId: 1 },
      data: { name: "chewed" },
      include: { owner: true },
    })
    toys.sort((a, b) => a.id - b.id)
    expect(toys).toEqual([
      { id: 1, name: "chewed", ownerId: 1, owner: { id: 1, name: "Rex", ownerId: 1 } },
      { id: 3, name: "chewed", ownerId: 1, owner: { id: 1, name: "Rex", ownerId: 1 } },
    ])
  })

  test("updateManyAndReturn update where values", async () => {
    const client = await createPrismaClient(data)
    const users = await client.user.updateManyAndReturn({
      where: {
        clicks: {
          gt: 3
        },
      },
      data: {
        name: 'Bard',
        clicks: 2,
      },
    })
    expect(users).toMatchInlineSnapshot(`
Array [
  Object {
    "accountId": null,
    "age": 10,
    "clicks": 2,
    "deleted": false,
    "id": 2,
    "name": "Bard",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
]
`)
  })

})



