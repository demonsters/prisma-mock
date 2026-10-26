// @ts-nocheck

import createPrismaClient from "./createPrismaClient"
import createPrismaMock from "../src"

describe("PrismaClient $getInternalState", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  const data = {
    user: [
      {
        name: "sadfsdf",
        uniqueField: "user1",
      },
    ],
    answers: [
      {
        id: 1,
        title: "Answer",
      },
      {
        id: 2,
        title: "Answer",
      },
      {
        id: 3,
        title: "Answer",
      },
    ],
    userAnswers: [],
    element: [],
  }

  test("base", async () => {
    const client = await createPrismaClient(data)

    expect(client.$getInternalState()).toMatchInlineSnapshot(`
      Object {
        "account": Array [],
        "answers": Array [
          Object {
            "id": 1,
            "title": "Answer",
          },
          Object {
            "id": 2,
            "title": "Answer",
          },
          Object {
            "id": 3,
            "title": "Answer",
          },
        ],
        "dbGeneratedId": Array [],
        "document": Array [],
        "element": Array [],
        "membership": Array [],
        "organization": Array [],
        "organizationUser": Array [],
        "pet": Array [],
        "post": Array [],
        "stripe": Array [],
        "toy": Array [],
        "transaction": Array [],
        "user": Array [
          Object {
            "accountId": null,
            "age": 10,
            "clicks": null,
            "deleted": false,
            "id": 1,
            "name": "sadfsdf",
            "role": "ADMIN",
            "sort": null,
            "uniqueField": "user1",
          },
        ],
        "userAnswers": Array [],
      }
    `)
  })

  test("create", async () => {
    const client = await createPrismaClient(data)
    await client.userAnswers.create({
      data: {
        user: { connect: { id: 1 } },
        answer: { connect: { id: 1 } },
      },
    })

    expect(client.$getInternalState()).toMatchInlineSnapshot(`
      Object {
        "account": Array [],
        "answers": Array [
          Object {
            "id": 1,
            "title": "Answer",
          },
          Object {
            "id": 2,
            "title": "Answer",
          },
          Object {
            "id": 3,
            "title": "Answer",
          },
        ],
        "dbGeneratedId": Array [],
        "document": Array [],
        "element": Array [],
        "membership": Array [],
        "organization": Array [],
        "organizationUser": Array [],
        "pet": Array [],
        "post": Array [],
        "stripe": Array [],
        "toy": Array [],
        "transaction": Array [],
        "user": Array [
          Object {
            "accountId": null,
            "age": 10,
            "clicks": null,
            "deleted": false,
            "id": 1,
            "name": "sadfsdf",
            "role": "ADMIN",
            "sort": null,
            "uniqueField": "user1",
          },
        ],
        "userAnswers": Array [
          Object {
            "answerId": 1,
            "userId": 1,
            "value": null,
          },
        ],
      }
    `)
  })

  test("delete", async () => {
    const client = await createPrismaClient(data)

    await client.answers.deleteMany({})

    expect(client.$getInternalState()).toMatchInlineSnapshot(`
      Object {
        "account": Array [],
        "answers": Array [],
        "dbGeneratedId": Array [],
        "document": Array [],
        "element": Array [],
        "membership": Array [],
        "organization": Array [],
        "organizationUser": Array [],
        "pet": Array [],
        "post": Array [],
        "stripe": Array [],
        "toy": Array [],
        "transaction": Array [],
        "user": Array [
          Object {
            "accountId": null,
            "age": 10,
            "clicks": null,
            "deleted": false,
            "id": 1,
            "name": "sadfsdf",
            "role": "ADMIN",
            "sort": null,
            "uniqueField": "user1",
          },
        ],
        "userAnswers": Array [],
      }
    `)
  })

  test("updateMany", async () => {
    const client = await createPrismaClient(data)

    await client.userAnswers.updateMany({
      data: {
        answerId: 3,
      },
    })

    expect(client.$getInternalState()).toMatchInlineSnapshot(`
      Object {
        "account": Array [],
        "answers": Array [
          Object {
            "id": 1,
            "title": "Answer",
          },
          Object {
            "id": 2,
            "title": "Answer",
          },
          Object {
            "id": 3,
            "title": "Answer",
          },
        ],
        "dbGeneratedId": Array [],
        "document": Array [],
        "element": Array [],
        "membership": Array [],
        "organization": Array [],
        "organizationUser": Array [],
        "pet": Array [],
        "post": Array [],
        "stripe": Array [],
        "toy": Array [],
        "transaction": Array [],
        "user": Array [
          Object {
            "accountId": null,
            "age": 10,
            "clicks": null,
            "deleted": false,
            "id": 1,
            "name": "sadfsdf",
            "role": "ADMIN",
            "sort": null,
            "uniqueField": "user1",
          },
        ],
        "userAnswers": Array [],
      }
    `)
  })

  describe("$clear", () => {
    test("keeps the empty tables, so updateMany and deleteMany work on a model with no rows", async () => {
      const client = createPrismaMock()
      client.$clear()

      expect(await client.user.updateMany({ where: {}, data: { name: "x" } })).toEqual({ count: 0 })
      expect(await client.user.deleteMany({ where: {} })).toEqual({ count: 0 })
      expect(client.$getInternalState().user).toEqual([])
    })

    test("restores the initial data", async () => {
      const client = createPrismaMock({
        data: { user: [{ id: 1, name: "initial", uniqueField: "user1" }] },
      })
      await client.user.create({ data: { id: 2, uniqueField: "user2" } })
      await client.user.updateMany({ where: {}, data: { name: "changed" } })
      await client.post.create({ data: { title: "Post" } })

      client.$clear()

      expect(await client.user.findMany()).toEqual([
        expect.objectContaining({ id: 1, name: "initial" }),
      ])
      expect(await client.post.findMany()).toEqual([])
      expect(await client.post.deleteMany({ where: {} })).toEqual({ count: 0 })
    })
  })
})
