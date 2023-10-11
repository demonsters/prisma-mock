import createPrismaClient from './createPrismaClient'

describe("bulk-operations", () => {
  const data = {
    user: [
      { id: 1, name: 'Henk', clicks: 2, uniqueField: '1' },
      { id: 2, name: 'Piet', clicks: 5, uniqueField: '2' },
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
        { name: 'Klof', clicks: 2, uniqueField: '5' }
      ]
    })

    const users = await client.user.findMany();
    expect(users.length).toBe(4);
    expect(count).toEqual(2)
    
    await client.$disconnect()
  })
})
