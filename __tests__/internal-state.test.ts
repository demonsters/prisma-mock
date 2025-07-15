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
{
  "account": [],
  "answers": [
    {
      "id": 1,
      "title": "Answer",
    },
    {
      "id": 2,
      "title": "Answer",
    },
    {
      "id": 3,
      "title": "Answer",
    },
  ],
  "document": [],
  "element": [],
  "pet": [],
  "post": [],
  "stripe": [],
  "toy": [],
  "transaction": [],
  "user": [
    {
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
  "userAnswers": [],
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
{
  "account": [],
  "answers": [
    {
      "id": 1,
      "title": "Answer",
    },
    {
      "id": 2,
      "title": "Answer",
    },
    {
      "id": 3,
      "title": "Answer",
    },
  ],
  "document": [],
  "element": [],
  "pet": [],
  "post": [],
  "stripe": [],
  "toy": [],
  "transaction": [],
  "user": [
    {
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
  "userAnswers": [
    {
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
{
  "account": [],
  "answers": [],
  "document": [],
  "element": [],
  "pet": [],
  "post": [],
  "stripe": [],
  "toy": [],
  "transaction": [],
  "user": [
    {
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
  "userAnswers": [],
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
{
  "account": [],
  "answers": [
    {
      "id": 1,
      "title": "Answer",
    },
    {
      "id": 2,
      "title": "Answer",
    },
    {
      "id": 3,
      "title": "Answer",
    },
  ],
  "document": [],
  "element": [],
  "pet": [],
  "post": [],
  "stripe": [],
  "toy": [],
  "transaction": [],
  "user": [
    {
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
  "userAnswers": [],
}
`)
  })

})
