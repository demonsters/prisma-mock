// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

describe("PrismaClient $getInternalState", () => {
  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => { })
    return
  }

  // A write only checks the rows it wrote for a compound key held as a field, once the table
  // is known to hold none. A row pushed straight into the internal state changes the length,
  // so the next write checks every row again
  test("a pushed row holding a compound key as a field is flattened by the next create", async () => {
    const client = await createPrismaClient({
      user: [{ id: 1, uniqueField: "u1" }],
      answers: [{ id: 1, title: "a" }, { id: 2, title: "b" }, { id: 3, title: "c" }],
    })
    await client.userAnswers.create({ data: { userId: 1, answerId: 1, value: "created" } })
    client.$getInternalState().userAnswers.push({ userId_answerId: { userId: 1, answerId: 2 }, value: "pushed" })

    await client.userAnswers.create({ data: { userId: 1, answerId: 3, value: "created" } })

    expect(client.$getInternalState().userAnswers).toEqual([
      { userId: 1, answerId: 1, value: "created" },
      { userId: 1, answerId: 2, value: "pushed" },
      { userId: 1, answerId: 3, value: "created" },
    ])
  })

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
        "setting": Array [],
        "slug": Array [],
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
        "setting": Array [],
        "slug": Array [],
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
        "setting": Array [],
        "slug": Array [],
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
        "setting": Array [],
        "slug": Array [],
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
})
