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
  ],
}

describe("create-many-return", () => {
  test("create-many-return", async () => {
    const client = await createPrismaClient()
    const user = await client.user.createManyAndReturn({
      data: [
        {
          name: "New user",
          uniqueField: "1",
        },
        {
          name: "New user 2",
          uniqueField: "2",
        },
        {
          name: "New user 3",
          uniqueField: "3",
        },
      ],
    })
    expect(user).toMatchInlineSnapshot(`
[
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 1,
    "name": "New user",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "1",
  },
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 2,
    "name": "New user 2",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": "New user 3",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "3",
  },
]
`)
  })

  test("create-many-return with skipDuplicates", async () => {
    const client = await createPrismaClient()
    const user = await client.user.create({
      data: {
        id: 1,
        name: "New user 1",
        uniqueField: "1",
      },
    })
    const users = await client.user.createManyAndReturn({
      data: [
        {
          id: 2,
          name: "New user 2",
          uniqueField: "2",
        },
        {
          id: 3,
          name: "New user 3",
          uniqueField: "3",
        },
      ],
      skipDuplicates: true,
    })
    expect(users).toMatchInlineSnapshot(`
[
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 2,
    "name": "New user 2",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
  {
    "accountId": null,
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 3,
    "name": "New user 3",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "3",
  },
]
`)
  })

  test("create-many-return with include", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.createManyAndReturn({
      data: [
        {
          name: "New user",
          uniqueField: "1",
          accountId: 1,
        },
        {
          name: "New user 2",
          uniqueField: "2",
          accountId: 2,
        },
      ],
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
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 1,
    "name": "New user",
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
    "age": 10,
    "clicks": null,
    "deleted": false,
    "id": 2,
    "name": "New user 2",
    "role": "ADMIN",
    "sort": null,
    "uniqueField": "2",
  },
]
`)
  })

  test("create-many-return with select", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.createManyAndReturn({
      data: [
        {
          name: "New user",
          uniqueField: "1",
          accountId: 1,
        },
        {
          name: "New user 2",
          uniqueField: "2",
          accountId: 2,
        },
      ],
      select: {
        name: true,
        accountId: true,
        account: {
          select: {
            name: true,
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
    "name": "New user",
  },
  {
    "account": {
      "name": "account 2",
    },
    "accountId": 2,
    "name": "New user 2",
  },
]
`)
  })

  test("create-many-return with omit", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.createManyAndReturn({
      data: [
        {
          age: 10,
          name: "New user 1",
          uniqueField: "1",
          accountId: 1,
        },
        {
          age: 10,
          name: "New user 2",
          uniqueField: "2",
          accountId: 2,
        },
      ],
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
    "age": 10,
    "clicks": null,
    "id": 1,
    "name": "New user 1",
    "uniqueField": "1",
  },
  {
    "age": 10,
    "clicks": null,
    "id": 2,
    "name": "New user 2",
    "uniqueField": "2",
  },
]
`)
  })

  test("create-many-return with select nested omit", async () => {
    const client = await createPrismaClient(data)
    const user = await client.user.createManyAndReturn({
      data: [
        {
          age: 10,
          name: "New user 1",
          uniqueField: "1",
          accountId: 1,
        },
        {
          age: 10,
          name: "New user 2",
          uniqueField: "2",
          accountId: 2,
        },
      ],
      select: {
        name: true,
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
    "name": "New user 1",
  },
  {
    "account": {
      "name": "account 2",
    },
    "accountId": 2,
    "name": "New user 2",
  },
]
`)
  })
})
