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
[
  {
    "users": [
      {
        "_count": {
          "posts": 2,
        },
      },
    ],
  },
]
`)


})