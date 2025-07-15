// @ts-nocheck

import createPrismaClient from './createPrismaClient'

const data = {
  account: [
    {
      id: 1,
      name: 'B',
    },
    {
      id: 2,
      name: 'A',
    },
  ],
  user: [
    {
      id: 1,
      name: 'sadfsdf',
      accountId: 1,
      uniqueField: 'user',
    },
  ],
}

for (let i = 0; i < 10; i++) {
  data.user.push({
    id: i + 2,
    name: `user ${i + 2}`,
    uniqueField: `user ${i + 2}`,
    accountId: 2,
  })
}

const select = {
  id: true,
  name: true,
  uniqueField: true,
  accountId: true,
}

test('findMany cursor', async () => {
  const client = await createPrismaClient(data)
  const users = await client.user.findMany({
    take: 2,
    cursor: {
      id: 4
    },
    select,
    orderBy: {
      id: 'asc'
    }
  })
  expect(users).toMatchInlineSnapshot(`
[
  {
    "accountId": 2,
    "id": 4,
    "name": "user 4",
    "uniqueField": "user 4",
  },
  {
    "accountId": 2,
    "id": 5,
    "name": "user 5",
    "uniqueField": "user 5",
  },
]
`)
})
