// @ts-nocheck

import { Prisma } from "@prisma/client"
import createPrismaClient from "./createPrismaClient"

const setup = async (client) => {
  var json = [
    { name: 'Bob the dog' },
    { name: 'Claudine the cat' },
  ] as Prisma.JsonArray

  const user = await client.user.create({
    data: {
      name: "user",
      uniqueField: "user"
    }
  })

  await client.element.create({
    data: {
      json: "A string test",
      value: "1",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: 123,
      value: "2",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: {
        object: "test"
      },
      value: "3",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: {
        "pet1": {
          "petName": "Claudine",
          "petType": "House cat"
        },
        "pet2": {
          "petName": "Sunny",
          "petType": "Gerbil",
          "features": {
            "eyeColor": "Brown",
            "furColor": "White and black"
          }
        }
      },
      value: "4",
      userId: user.id
    },
  })

  const obj = await client.element.create({
    data: {
      json,
      value: "5",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: {
        "cats": { "owned": ["Bob", "Sunny"], "fostering": ["Fido"] },
        "dogs": { "owned": ["Ella"], "fostering": ["Prince", "Empress"] }
      },
      value: "6",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: {
        "cats": { "owned": ["John"], "fostering": ["Bob"] }
      },
      value: "7",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: {
        "cats": { "owned": ["John"], "fostering": ["Bob", "Bill"] }
      },
      value: "8",
      userId: user.id
    },
  })

  await client.element.create({
    data: {
      json: Prisma.JsonNull,
      value: "9",
      userId: user.id
    }
  })

  await client.element.create({
    data: {
      json: Prisma.DbNull,
      value: "10",
      userId: user.id
    }
  })

  return obj
}

test('simple use case', async () => {
  const client = await createPrismaClient()
  const createElement = await setup(client)
  expect(createElement.json).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "Bob the dog",
  },
  Object {
    "name": "Claudine the cat",
  },
]
`)
})

describe("Filter on exact field value", () => {

  test("equals", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const json = [{ name: 'Bob the dog' }, { name: 'Claudine the cat' }]

    const getUsers = await client.element.findMany({
      where: {
        json: {
          equals: json,
        },
      },
    })
    expect(getUsers).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 5,
    "json": Array [
      Object {
        "name": "Bob the dog",
      },
      Object {
        "name": "Claudine the cat",
      },
    ],
    "userId": 1,
    "value": "5",
  },
]
`)
  })

  test("not", async () => {
    const client = await createPrismaClient()
    const el = await setup(client)
    const json = [{ name: 'Bob the dog' }, { name: 'Claudine the cat' }]

    const getUsers = await client.element.findMany({
      where: {
        json: {
          not: json,
        },
      },
    })
    const all = await client.element.findMany({
      where: {
        e_id: {
          not: el.e_id
        },
        json: {
          not: Prisma.DbNull
        }
      }
    })
    expect(getUsers).toEqual(all)
  })

})

describe("Filter on nested object property", () => {

  test("path", async () => {

    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['pet2', 'petName'],
          equals: 'Sunny',
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 4,
    "json": Object {
      "pet1": Object {
        "petName": "Claudine",
        "petType": "House cat",
      },
      "pet2": Object {
        "features": Object {
          "eyeColor": "Brown",
          "furColor": "White and black",
        },
        "petName": "Sunny",
        "petType": "Gerbil",
      },
    },
    "userId": 1,
    "value": "4",
  },
]
`)
  })


  test("string_contains", async () => {

    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['pet1', 'petType'],
          string_contains: 'cat',
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 4,
    "json": Object {
      "pet1": Object {
        "petName": "Claudine",
        "petType": "House cat",
      },
      "pet2": Object {
        "features": Object {
          "eyeColor": "Brown",
          "furColor": "White and black",
        },
        "petName": "Sunny",
        "petType": "Gerbil",
      },
    },
    "userId": 1,
    "value": "4",
  },
]
`)
  })

  test("string_starts_with", async () => {

    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['pet1', 'petType'],
          string_starts_with: 'House',
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 4,
    "json": Object {
      "pet1": Object {
        "petName": "Claudine",
        "petType": "House cat",
      },
      "pet2": Object {
        "features": Object {
          "eyeColor": "Brown",
          "furColor": "White and black",
        },
        "petName": "Sunny",
        "petType": "Gerbil",
      },
    },
    "userId": 1,
    "value": "4",
  },
]
`)
  })

  test("string_ends_with", async () => {

    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['pet1', 'petType'],
          string_ends_with: 'cat',
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 4,
    "json": Object {
      "pet1": Object {
        "petName": "Claudine",
        "petType": "House cat",
      },
      "pet2": Object {
        "features": Object {
          "eyeColor": "Brown",
          "furColor": "White and black",
        },
        "petName": "Sunny",
        "petType": "Gerbil",
      },
    },
    "userId": 1,
    "value": "4",
  },
]
`)
  })
})



describe("Filtering on an array value", () => {
  test("array_contains", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          array_contains: [{
            name: 'Bob the dog'
          }],
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 5,
    "json": Array [
      Object {
        "name": "Bob the dog",
      },
      Object {
        "name": "Claudine the cat",
      },
    ],
    "userId": 1,
    "value": "5",
  },
]
`)
  })

})

describe("Filtering on nested array value", () => {

  test(")ne", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['cats', 'fostering'],
          array_contains: ['Fido'],
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 6,
    "json": Object {
      "cats": Object {
        "fostering": Array [
          "Fido",
        ],
        "owned": Array [
          "Bob",
          "Sunny",
        ],
      },
      "dogs": Object {
        "fostering": Array [
          "Prince",
          "Empress",
        ],
        "owned": Array [
          "Ella",
        ],
      },
    },
    "userId": 1,
    "value": "6",
  },
]
`)
  })


  test("Two with no match", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['cats', 'fostering'],
          array_contains: ['Fido', 'Bob'],
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`Array []`)
  })

  test("Two with match", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          path: ['cats', 'fostering'],
          array_contains: ['Bill', 'Bob'],
        },
      },
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 8,
    "json": Object {
      "cats": Object {
        "fostering": Array [
          "Bob",
          "Bill",
        ],
        "owned": Array [
          "John",
        ],
      },
    },
    "userId": 1,
    "value": "8",
  },
]
`)
  })
})



describe("Filtering on object key value inside array (MySQL only)", () => {

  // test("array_contains", async () => {
  //   const client = await createPrismaClient()
  //   await setup(client)
  //   const element = await client.element.findMany({
  //     where: {
  //       json: {
  //         path: "$[*].name",
  //         array_contains: 'Bob the dog',
  //       },
  //     },
  //   })
  //   expect(element).toMatchInlineSnapshot()
  // })

})


describe("Using null Values", () => {

  test("JsonNull", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          equals: Prisma.JsonNull
        }
      }
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 9,
    "json": null,
    "userId": 1,
    "value": "9",
  },
]
`)
  })

  test("DbNull", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          equals: Prisma.DbNull
        }
      }
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 10,
    "json": null,
    "userId": 1,
    "value": "10",
  },
]
`)
  })

  test("AnyNull", async () => {
    const client = await createPrismaClient()
    await setup(client)
    const element = await client.element.findMany({
      where: {
        json: {
          equals: Prisma.AnyNull
        }
      }
    })
    expect(element).toMatchInlineSnapshot(`
Array [
  Object {
    "e_id": 9,
    "json": null,
    "userId": 1,
    "value": "9",
  },
  Object {
    "e_id": 10,
    "json": null,
    "userId": 1,
    "value": "10",
  },
]
`)
  })
})