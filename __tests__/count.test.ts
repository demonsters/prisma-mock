// @ts-nocheck

import createPrismaClient from "./createPrismaClient"



test("_count", async () => {

  const client = await createPrismaClient()

  const account = await client.account.create({
    data: {
      
    }
  })

  const user = await client.user.create({
    data: {
      role: "USER",
      uniqueField: "user",
      account: {
        connect: {
          id: account.id
        }
      }
    }
  })

  await client.post.create({
    data: {
      title: "A",
      author: {
        connect: {
          id: user.id
        }
      }
    }
  })
  await client.post.create({
    data: {
      title: "B",
      author: {
        connect: {
          id: user.id
        }
      }
    }
  })
  
  await client.post.create({
    data: {
      title: "C",
    }
  })

  const result = await client.account.findMany({
    select: {
      users: {
        select: {
          _count: {
            
            select: {
              posts: true
            }
          }
        }
      }
    }
  })

  expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "users": Array [
      Object {
        "_count": Object {
          "posts": 2,
        },
      },
    ],
  },
]
`)


})

describe("_count of a relation", () => {
  const setup = async () => {
    const client = await createPrismaClient()
    const user = await client.user.create({
      data: {
        uniqueField: "user",
        posts: {
          create: [
            { title: "A", published: true },
            { title: "B", published: false },
            { title: "C", published: true },
          ],
        },
        pets: {
          create: [{ name: "Rex" }],
        },
      },
    })
    // A post of another user, which no count should include
    await client.user.create({
      data: {
        uniqueField: "other",
        posts: { create: [{ title: "D", published: true }] },
      },
    })
    return { client, user }
  }

  test("with a where", async () => {
    const { client, user } = await setup()

    const result = await client.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        _count: {
          select: {
            posts: { where: { published: true } },
            pets: true,
          },
        },
      },
    })

    expect(result).toEqual({ _count: { posts: 2, pets: 1 } })
  })

  test("with a where in an include", async () => {
    const { client, user } = await setup()

    const result = await client.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        _count: {
          select: {
            posts: { where: { title: { in: ["A", "B"] } } },
          },
        },
      },
    })

    expect(result._count).toEqual({ posts: 2 })
  })

  test("leaves out relations set to false", async () => {
    const { client, user } = await setup()

    const result = await client.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        _count: {
          select: {
            posts: true,
            pets: false,
          },
        },
      },
    })

    expect(result).toEqual({ _count: { posts: 3 } })
  })

  test("_count: true counts every list relation", async () => {
    const { client, user } = await setup()

    const result = await client.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        _count: true,
      },
    })

    expect(result).toEqual({
      _count: {
        answers: 0,
        guestOf: 0,
        element: 0,
        posts: 3,
        documents: 0,
        pets: 1,
      },
    })
  })
})
