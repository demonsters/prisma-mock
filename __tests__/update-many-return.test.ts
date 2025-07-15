import createPrismaClient from "./createPrismaClient"

const data = {
  account: [
    {
      id: 1,
      name: "account 1",
      sort: null,
    },
    {
      id: 2,
      name: "account 2",
      sort: null,
    },
    {
      id: 3,
      name: "account 3",
      sort: null,
    },
  ],
  user: [
    {
      id: 1,
      name: "New user 1",
      uniqueField: "1",
      accountId: 1,
      age: 10,
    },
    {
      id: 2,
      name: "New user 2",
      uniqueField: "2",
      accountId: 2,
      age: 10,
    },
    {
      id: 3,
      name: "New user 3",
      uniqueField: "3",
      accountId: 3,
      age: 10,
    },
  ],
}

describe("update-many-return", () => {
  test("simple update-many-return", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.updateManyAndReturn({
      data: {
        name: "General User",
      },
      where: {
        id: 1,
      },
    })
    expect(user).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 1,
    "name": "General User",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "1",
  },
]
`)
  })

  test("update-many-return with include", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.updateManyAndReturn({
      data: {
        name: "Updated name",
        age: 20,
      },
      include: {
        account: true,
      },
    })
    expect(user).toMatchInlineSnapshot(`
  [
    {
      "account": {
        "id": 1,
        "name": "account 1",
        "sort": null,
      },
      "accountId": 1,
      "age": 20,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": "Updated name",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "1",
    },
    {
      "account": {
        "id": 2,
        "name": "account 2",
        "sort": null,
      },
      "accountId": 2,
      "age": 20,
      "clicks": null,
      "deleted": false,
      "id": 2,
      "name": "Updated name",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "2",
    },
    {
      "account": {
        "id": 3,
        "name": "account 3",
        "sort": null,
      },
      "accountId": 3,
      "age": 20,
      "clicks": null,
      "deleted": false,
      "id": 3,
      "name": "Updated name",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "3",
    },
  ]
  `)
  })

  test("update-many-return with select", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.updateManyAndReturn({
      data: {
        name: "Updated name",
      },
      select: {
        id: true,
        name: true,
      },
    })
    expect(user).toMatchInlineSnapshot(`
  [
    {
      "id": 1,
      "name": "Updated name",
    },
    {
      "id": 2,
      "name": "Updated name",
    },
    {
      "id": 3,
      "name": "Updated name",
    },
  ]
  `)
  })

  test("update-many-return with omit", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.updateManyAndReturn({
      data: {
        age: 20,
      },
      omit: {
        role: true,
        deleted: true,
        sort: true,
        accountId: true,
      },
    })
    expect(user).toMatchInlineSnapshot(`
  [
    {
      "age": 20,
      "clicks": null,
      "id": 1,
      "name": "New user 1",
      "uniqueField": "1",
    },
    {
      "age": 20,
      "clicks": null,
      "id": 2,
      "name": "New user 2",
      "uniqueField": "2",
    },
    {
      "age": 20,
      "clicks": null,
      "id": 3,
      "name": "New user 3",
      "uniqueField": "3",
    },
  ]
  `)
  })

  test("update-many-return with select nested omit", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.updateManyAndReturn({
      data: {
        age: 20,
        name: "Updated name",
      },
      select: {
        name: true,
        age: true,
        accountId: true,
        account: {
          omit: {
            id: true,
            sort: true,
          },
        },
      },
    })
    expect(user).toMatchInlineSnapshot(`
  [
    {
      "account": {
        "name": "account 1",
      },
      "accountId": 1,
      "age": 20,
      "name": "Updated name",
    },
    {
      "account": {
        "name": "account 2",
      },
      "accountId": 2,
      "age": 20,
      "name": "Updated name",
    },
    {
      "account": {
        "name": "account 3",
      },
      "accountId": 3,
      "age": 20,
      "name": "Updated name",
    },
  ]
  `)
  })
})
