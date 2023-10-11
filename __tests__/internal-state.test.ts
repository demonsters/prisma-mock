// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

describe("PrismaClient $getInternalState", () => {

  // Should not run for postgresql
  if (process.env.PROVIDER === "postgresql") {
    test("skip", () => {
    })
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
  "document": Array [],
  "element": Array [],
  "pet": Array [],
  "post": Array [],
  "stripe": Array [],
  "toy": Array [],
  "transaction": Array [],
  "user": Array [
    Object {
      "accountId": null,
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
  "document": Array [],
  "element": Array [],
  "pet": Array [],
  "post": Array [],
  "stripe": Array [],
  "toy": Array [],
  "transaction": Array [],
  "user": Array [
    Object {
      "accountId": null,
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
  "document": Array [],
  "element": Array [],
  "pet": Array [],
  "post": Array [],
  "stripe": Array [],
  "toy": Array [],
  "transaction": Array [],
  "user": Array [
    Object {
      "accountId": null,
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
  "document": Array [],
  "element": Array [],
  "pet": Array [],
  "post": Array [],
  "stripe": Array [],
  "toy": Array [],
  "transaction": Array [],
  "user": Array [
    Object {
      "accountId": null,
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
