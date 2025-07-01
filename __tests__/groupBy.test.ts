

import createPrismaClient from './createPrismaClient'

const setup = async () => {
  return await createPrismaClient({
    user: [
      { id: 1, age: 25, uniqueField: "1", name: "John" },
      { id: 2, age: 30, uniqueField: "2", name: "Jane" },
      { id: 3, age: 35, uniqueField: "3", name: "John" },
      { id: 4, age: 40, uniqueField: "4", name: "Jane" },
    ],
  })
}


test("Should group by name with count", async () => {
  const client = await setup()

  const result = await client.user.groupBy({
    by: ["name"],
    _count: {
      _all: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "_count": Object {
      "_all": 2,
    },
    "name": "Jane",
  },
  Object {
    "_count": Object {
      "_all": 2,
    },
    "name": "John",
  },
]
`)
})


test("Should group by name with avg", async () => {
  const client = await setup()

  const result = await client.user.groupBy({
    by: ["name"],
    _avg: {
      age: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "_avg": Object {
      "age": 35,
    },
    "name": "Jane",
  },
  Object {
    "_avg": Object {
      "age": 30,
    },
    "name": "John",
  },
]
`)


})

describe("Having", () => {

  test("Should group by name with avg", async () => {
    const client = await setup()

    const result = await client.user.groupBy({
      by: ["name"],
      _avg: {
        age: true,
      },
      having: {
        age: {
          _avg: {
            gt: 30,
          }
        }
      },
    })

    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "_avg": Object {
      "age": 35,
    },
    "name": "Jane",
  },
]
`)
  })

  test("Should group by name having not in select", async () => {
    const client = await setup()

    const result = await client.user.groupBy({
      by: ["name"],
      _count: {
        age: true,
      },
      having: {
        age: {
          _avg: {
            gt: 30,
          }
        }
      },
    })

    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "_count": Object {
      "age": 2,
    },
    "name": "Jane",
  },
]
`)
  })

})
