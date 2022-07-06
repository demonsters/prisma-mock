// @ts-nocheck

import createPrismaClient from '../src'

describe('Create', () => {

  test('create', async () => {
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


})

describe("Update", () => {

  test('update', async () => {
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

  test('disconnect', async () => {
    const client = await createPrismaClient({
      account: [
        { id: 1, name: "A" }
      ],
      stripe: [{
        id: 2,
        accountId: 1,
      }],
    })
    const answer = await client.stripe.update({
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
    expect(answer.account).toEqual(null)
  })


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
      active: false
    }, {
      id: 2,
      accountId: 2,
      active: true
    }],
  })

  const accounts = await client.account.findMany({
    where: {
      stripe: { active: true }
    }
  })
  expect(accounts).toHaveLength(1)
})