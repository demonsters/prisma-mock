// @ts-nocheck

import createPrismaClient from './createPrismaClient'

describe("Referential actions", () => {

  describe("onDelete", () => {

    test("SetNull", async () => {

      const client = await createPrismaClient({
        account: [
          { id: 1, name: "A" }
        ],
        user: [
          { id: 1, name: "sadfsdf", accountId: 1, uniqueField: "user" },
        ],
      })
      await client.account.delete({
        where: { id: 1 }
      })

      const user = await client.user.findUnique({
        where: { id: 1 }
      })
      expect(user.accountId).toEqual(null)

    })

    test("Cascade", async () => {

      const client = await createPrismaClient({
        account: [
          { id: 1, name: "A" }
        ],
        stripe: [
          { id: 1, accountId: 1, customerId: "1" },
        ],
      })
      await client.account.delete({
        where: { id: 1 }
      })

      const stripe = await client.stripe.findUnique({
        where: { id: 1 }
      })
      expect(stripe).toEqual(null)

    })

  })

})