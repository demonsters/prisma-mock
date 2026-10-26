

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


test("Should group by name with _count: true", async () => {
  const client = await setup()

  const result = await client.user.groupBy({
    by: ["name"],
    _count: true,
    orderBy: {
      name: "asc",
    },
  })

  expect(result).toEqual([
    { name: "Jane", _count: 2 },
    { name: "John", _count: 2 },
  ])
})

test("Should group by name with the count of a field", async () => {
  const client = await createPrismaClient({
    user: [
      { id: 1, uniqueField: "1", name: "John", clicks: 1 },
      { id: 2, uniqueField: "2", name: "John", clicks: null },
      { id: 3, uniqueField: "3", name: "Jane", clicks: 3 },
    ],
  })

  const result = await client.user.groupBy({
    by: ["name"],
    _count: {
      _all: true,
      clicks: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  expect(result).toEqual([
    { name: "Jane", _count: { _all: 1, clicks: 1 } },
    { name: "John", _count: { _all: 2, clicks: 1 } },
  ])
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
          },
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

test("Should group by with the min and max of a DateTime as a Date", async () => {
  const client = await createPrismaClient({
    post: [
      { id: 1, title: "A", created: new Date("2026-01-02T00:00:00Z") },
      { id: 2, title: "A", created: new Date("2026-01-01T00:00:00Z") },
      { id: 3, title: "B", created: new Date("2026-01-03T00:00:00Z") },
    ],
  })

  const result = await client.post.groupBy({
    by: ["title"],
    _min: { created: true },
    _max: { created: true },
    orderBy: { title: "asc" },
  })

  expect(result).toEqual([
    {
      title: "A",
      _min: { created: new Date("2026-01-01T00:00:00Z") },
      _max: { created: new Date("2026-01-02T00:00:00Z") },
    },
    {
      title: "B",
      _min: { created: new Date("2026-01-03T00:00:00Z") },
      _max: { created: new Date("2026-01-03T00:00:00Z") },
    },
  ])
})
