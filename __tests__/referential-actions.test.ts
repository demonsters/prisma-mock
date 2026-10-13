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

    test("SetNull on every row referring to the deleted one", async () => {

      const client = await createPrismaClient({
        account: [
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ],
        user: [
          { id: 1, accountId: 1, uniqueField: "u1" },
          { id: 2, accountId: 2, uniqueField: "u2" },
          { id: 3, accountId: 1, uniqueField: "u3" },
        ],
      })
      await client.account.delete({
        where: { id: 1 }
      })

      const users = await client.user.findMany({ orderBy: { id: "asc" } })
      expect(users.map((user) => user.accountId)).toEqual([null, 2, null])

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

    test("Cascade removes every row referring to the deleted one", async () => {

      const client = await createPrismaClient({
        post: [
          { id: 1, title: "A" },
          { id: 2, title: "B" },
        ],
        comment: [
          { id: 1, text: "a1", postId: 1 },
          { id: 2, text: "b1", postId: 2 },
          { id: 3, text: "a2", postId: 1 },
          { id: 4, text: "a3", postId: 1 },
        ],
      })
      await client.post.delete({
        where: { id: 1 }
      })

      const comments = await client.comment.findMany({ orderBy: { id: "asc" } })
      expect(comments.map((comment) => comment.id)).toEqual([2])
      expect(await client.comment.count({ where: { postId: 1 } })).toEqual(0)

    })

    test("Cascade from deleteMany removes the rows of every deleted row", async () => {

      const client = await createPrismaClient({
        post: [
          { id: 1, title: "A" },
          { id: 2, title: "B" },
          { id: 3, title: "C" },
        ],
        comment: [
          { id: 1, text: "a1", postId: 1 },
          { id: 2, text: "b1", postId: 2 },
          { id: 3, text: "c1", postId: 3 },
          { id: 4, text: "b2", postId: 2 },
        ],
      })
      await client.post.deleteMany({
        where: { id: { in: [2, 3] } }
      })

      const comments = await client.comment.findMany({ orderBy: { id: "asc" } })
      expect(comments.map((comment) => comment.id)).toEqual([1])

    })

  })

})