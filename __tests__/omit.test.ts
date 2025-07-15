import createPrismaClient from "./createPrismaClient"

const data = {
  account: [
    {
      id: 1,
      name: "sadfsdf",
      sort: null,
    },
    {
      id: 2,
      name: "adsfasdf2",
      sort: null,
    },
  ],
  user: [
    {
      accountId: 1,
      clicks: null,
      deleted: false,
      name: "Admin",
      age: 10,
      sort: null,
      role: "ADMIN",
      uniqueField: "first",
    },
    {
      accountId: 2,
      clicks: null,
      deleted: false,
      name: "Admin 2",
      age: 11,
      sort: null,
      role: "ADMIN",
      uniqueField: "seccond",
    },
  ],
}

describe("omit", () => {
  test("omit simple", async () => {
    const client = await createPrismaClient(data)

    const users = await client.user.findMany({
      omit: {
        role: true,
        deleted: true,
        sort: true,
        accountId: true,
      },
    })

    expect(users).toMatchInlineSnapshot(`
[
  {
    "age": 10,
    "clicks": null,
    "id": 1,
    "name": "Admin",
    "uniqueField": "first",
  },
  {
    "age": 11,
    "clicks": null,
    "id": 2,
    "name": "Admin 2",
    "uniqueField": "seccond",
  },
]
`)
  })

  test("omit nested", async () => {
    const client = await createPrismaClient(data)

    const users = await client.user.findMany({
      include: {
        account: {
          omit: {
            sort: true,
            id: true,
          },
        },
      },
    })

    expect(users).toMatchInlineSnapshot(`
[
  {
    "account": {
      "name": "sadfsdf",
    },
    "accountId": 1,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 1,
    "name": "Admin",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "first",
  },
  {
    "account": {
      "name": "adsfasdf2",
    },
    "accountId": 2,
    "age": 11,
    "clicks": null,
    "deleted": false,
    "id": 2,
    "name": "Admin 2",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "seccond",
  },
]
`)
  })

  test("omit nested with select", async () => {
    const client = await createPrismaClient(data)

    const users = await client.user.findMany({
      select: {
        name: true,
        account: {
          omit: {
            sort: true,
          },
        },
      },
    })

    expect(users).toMatchInlineSnapshot(`
[
  {
    "account": {
      "id": 1,
      "name": "sadfsdf",
    },
    "name": "Admin",
  },
  {
    "account": {
      "id": 2,
      "name": "adsfasdf2",
    },
    "name": "Admin 2",
  },
]
`)
  })
})
