// @ts-nocheck

import createPrismaClient from './createPrismaClient'

test('create', async () => {
  const client = await createPrismaClient({})
  // TODO: Check output
  const user = await client.user.create({
    data: {
      role: "USER",
      account: {
        create: {

        },
      },
      uniqueField: 'user',
    },
    include: {
      account: true
    }
  })
  expect(user).toMatchInlineSnapshot(`
Object {
  "account": Object {
    "id": 1,
    "name": null,
    "sort": null,
  },
  "accountId": 1,
  "clicks": null,
  "deleted": false,
  "id": 1,
  "name": null,
  "role": "USER",
  "sort": null,
  "uniqueField": "user",
}
`)
})


test('update', async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A" }
    ],
    stripe: [{
      id: 2,
      accountId: 1,
      customerId: "1"
    }],
  })
  
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
  expect(answer).toMatchInlineSnapshot(`
Object {
  "account": Object {
    "id": 1,
    "name": "B",
    "sort": null,
  },
  "accountId": 1,
  "active": false,
  "customerId": "1",
  "id": 2,
  "sort": null,
}
`)
})

test('disconnect', async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A" }
    ],
    user: [{
      id: 2,
      accountId: 1,
      uniqueField: 'user'
    }],
  })
  const user = await client.user.update({
    data: {
      account: {
        disconnect: true
      }
    },
    where: {
      id: 2
    },
    include: {
      account: true
    }
  })
  expect(user.account).toEqual(null)
})

test.skip('disconnect other direction', async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A" }
    ],
    user: [{
      id: 2,
      accountId: 1,
      uniqueField: 'user'
    }],
  })
  const answer = await client.account.update({
    data: {
      user: {
        disconnect: true
      }
    },
    where: {
      id: 1
    },
    include: {
      user: true
    }
  })
  expect(answer.stripe).toEqual(null)
})

test('Delete', async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A" }
    ],
    user: [{
      id: 2,
      accountId: 1,
      uniqueField: 'user'
    }],
  })
  const user = await client.user.update({
    data: {
      account: {
        delete: true
      }
    },
    where: {
      id: 2
    },
    include: {
      account: true
    }
  })
  expect(user.account).toEqual(null)
  const accounts = await client.account.findMany()
  expect(accounts).toEqual([])
})



test("select", async () => {
  const client = await createPrismaClient({
    account: [
      { id: 1, name: "A", },
      { id: 2, name: "B", },
    ],
    stripe: [{
      id: 1,
      accountId: 1,
      active: false,
      customerId: "1",
    }, {
      id: 2,
      accountId: 2,
      active: true,
      customerId: "2",
    }],
  })

  const accounts = await client.account.findMany({
    where: {
      stripe: { active: true }
    }
  })
  expect(accounts).toHaveLength(1)
})
