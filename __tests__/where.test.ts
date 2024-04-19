// @ts-nocheck

import createPrismaClient from "./createPrismaClient"
import { Role } from "@prisma/client"

describe("PrismaClient where", () => {
  const date1 = new Date('2020-02-01T14:00:00.000Z')
  const date2 = new Date('2020-02-02T14:00:00.000Z')

  const data = {
    account: [
      {
        name: "Piet",
      },
      {
        name: "Dirk",
      },
      {
        name: "Sjors",
      },
      {
        name: "ABBY",
      },
      {
        name: null
      }
    ],
    user: [
      {
        id: 1,
        name: "Henk",
        accountId: 1,
        uniqueField: "user 1",
      },
      {
        id: 2,
        name: "Dirk",
        accountId: 2,
        uniqueField: "user 2",
      },
    ],
    post: [
      {
        title: "Piet",
        updated: date1,
        created: date1,
      },
      {
        title: "Dirk",
        updated: date2,
        created: date2,
      },
      {
        title: "Sjors",
        updated: date2,
        created: date2,
      },
      {
        title: "ABBY",
        updated: date2,
        created: date2,
      },
    ],
    element: [
      {
        e_id: 1,
        json: {
          data: "first"
        },
        userId: 1,
        value: "value 1",
      },
      {
        e_id: 2,
        json: {
          data: "second"
        },
        userId: 2,
        value: "value 2",
      }
    ],
    stripe: [
      {
        id: 1,
        customerId: "cus_123",
        accountId: 2,
      },
    ],
  }

  describe.each([false, true])(
    "caseInsensitive %p",
    (caseInsensitive: boolean) => {

      describe("No mode", () => {

        if (process.env.PROVIDER === "postgresql" && caseInsensitive) {
          // Can't test case insensitive for postgresql without mode right now
          return
        }

        test("multiple", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.post.findMany({
            where: {
              created: { lte: date1 },
              title: caseInsensitive ? "dirk" : "Dirk",
            },
          })
          expect(accounts.length).toBe(0)
          expect(accounts).toMatchSnapshot()
          // expect(account).not.toEqual([data.post[0]]);
        })

        test("notIn", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              name: { notIn: ["Piet", "Sjors"] },
            },
          })
          expect(accounts).toMatchSnapshot()
          expect(accounts.length).toEqual(2)
          // expect(account).toEqual([data.account[1], data.account[3]]);
        })

        test("Json: equals", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const elements = await client.element.findMany({
            where: {
              json: {
                equals: {
                  data: "first"
                }
              }
            },
          })
          expect(elements).toMatchSnapshot()
          // expect(element).toEqual([data.element[0]]);
        })
      
        test("in", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              name: { in: ["Piet", "Sjors"] },
            },
          })
          expect(accounts).toMatchSnapshot()
          expect(accounts.length).toEqual(2)
          // expect(account).toEqual([data.account[0], data.account[2]]);
        })
      
        test("in (nested)", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.user.findMany({
            where: {
              account: {
                name: { in: ["Piet", "Sjors"] },
              }
            },
          })
          expect(accounts).toMatchSnapshot()
          expect(accounts.length).toEqual(1)
          // expect(account).toEqual([data.account[0], data.account[2]]);
        })

        test("Nested", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.user.findMany({
            where: {
              account: {
                name: "Dirk",
              },
            },
          })
          expect(accounts.length).toEqual(1)
          expect(accounts).toMatchSnapshot()
        })

        test("OR", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              OR: [{ name: "Dirk" }, { name: "Piet" }],
            },
          })
          expect(accounts.length).toEqual(2)
          expect(accounts).toMatchSnapshot()
          // expect(accounts).toEqual([data.account[0], data.account[1]]);
        })

        test("NOT array", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              NOT: [{ name: "Dirk" }, { name: "Piet" }],
            },
          })
          // expect(accounts.length).toEqual(3)
          expect(accounts).toMatchSnapshot()
          // expect(accounts).toEqual([data.account[2], data.account[3]]);
        })

        test("NOT object", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              NOT: { name: "Dirk" },
            },
          })
          expect(accounts.length).toEqual(3)
          expect(accounts).toMatchSnapshot()
          // expect(accounts).toEqual([data.account[2], data.account[3]]);
        })

        test("AND", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              AND: [{ name: "Dirk" }, { id: 2 }],
            },
          })
          expect(accounts.length).toEqual(1)
          expect(accounts).toMatchSnapshot()
          // expect(accounts).toEqual([data.account[1]]);
        })

        test("AND (failing)", async () => {
          const client = await createPrismaClient(data, {
            caseInsensitive,
          })
          const accounts = await client.account.findMany({
            where: {
              AND: [{ id: 1 }, { id: 2 }],
            },
          })
          expect(accounts.length).toEqual(0)
          expect(accounts).toMatchSnapshot()
          // expect(accounts).toEqual([data.account[1]]);
        })
      })

      describe.each([false, true])(
        "mode %p",
        (mode: boolean) => {

          if (process.env.PROVIDER === "postgresql" && !mode && caseInsensitive) {
            // Can't test case insensitive for postgresql without mode right now
            return
          }

          let client: PrismaClient
          beforeEach(async () => {
            client = await createPrismaClient(data, mode ? undefined : {
              caseInsensitive: mode ? false : caseInsensitive,
            })
          })

          test("startsWith", async () => {
            const accounts = await client.account.findMany({
              where: {
                name: {
                  startsWith: caseInsensitive ? "di" : "Di",
                  mode: caseInsensitive && mode ? "insensitive" : "default",
                },
              },
            })
            expect(accounts.length).toBe(1)
            expect(accounts).toMatchSnapshot()
            // expect(account).toEqual([data.account[1]]);
          })

          test("endsWith", async () => {
            const client = await createPrismaClient(data, mode ? undefined : {
              caseInsensitive: mode ? false : caseInsensitive,
            })
            const accounts = await client.account.findMany({
              where: {
                name: {
                  endsWith: "rk",
                  mode: caseInsensitive && mode ? "insensitive" : "default",
                },
              },
            })
            expect(accounts).toMatchSnapshot()
            // expect(account).toEqual([data.account[1]]);
          })

          
          test("contains", async () => {
            const accounts = await client.account.findMany({
              where: {
                name: {
                  contains: "BB",
                  mode: caseInsensitive && mode ? "insensitive" : "default",
                },
              },
            })
            expect(accounts).toMatchSnapshot()
            // expect(account).toEqual([data.account[3]]);
          })

          test("equals", async () => {
            const accounts = await client.account.findMany({
              where: {
                name: {
                  equals: caseInsensitive ? "dirk" : "Dirk",
                  mode: caseInsensitive && mode ? "insensitive" : "default",
                },
              },
            })
            expect(accounts.length).toEqual(1)
            expect(accounts).toMatchSnapshot()
            // expect(account).toEqual([data.account[1]]);
          })
        }
      )
    }
  )

  describe("Case inrelevant", () => {

    test("gt", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          id: { gt: 1 },
        },
      })
      expect(accounts.length).toEqual(4)
      expect(accounts).toMatchSnapshot()
      // expect(account).toEqual([
      //   data.account[1],
      //   data.account[2],
      //   data.account[3],
      // ]);
    })

    test("gte", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          id: { gte: 1 },
        },
      })
      expect(accounts).toMatchSnapshot()
      // expect(account).toEqual(data.account);
    })

    test("lt", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          id: { lt: 2 },
        },
      })
      expect(accounts).toMatchSnapshot()
      expect(accounts.length).toEqual(1)
      // expect(account).toEqual([data.account[0]]);
    })

    test("lte", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          id: { lte: 2 },
        },
      })
      expect(accounts).toMatchSnapshot()
      expect(accounts.length).toEqual(2)
      // expect(account).toEqual([data.account[0], data.account[1]]);
    })

    test("not", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          id: { not: 2 },
        },
      })
      expect(accounts.length).toEqual(4)
      expect(accounts).toMatchSnapshot()
      // expect(account).toEqual([
      //   data.account[0],
      //   data.account[2],
      //   data.account[3],
      // ]);
    })

    test("Json: not", async () => {
      const client = await createPrismaClient(data)
      const elements = await client.element.findMany({
        where: {
          json: {
            not: {
              data: "first"
            }
          }
        },
      })
      expect(elements).toMatchSnapshot()
      expect(elements.length).toEqual(1)
      // expect(elements).toEqual([data.element[1]]);
    })

    test("Nested deep", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.user.findMany({
        where: {
          account: {
            stripe: {
              customerId: "cus_123",
            },
          },
        },
      })
      expect(accounts.length).toEqual(1)
      expect(accounts).toMatchSnapshot()
    })

    test("date", async () => {
      const client = await createPrismaClient(data)
      // Clone date & time
      const accounts = await client.post.findMany({
        where: {
          created: new Date(date1.getTime()),
        },
      })
      // expect(accounts).toEqual([data.post[0]]);
      expect(accounts.length).toEqual(1)
      expect(accounts).toMatchSnapshot()
    })
  })

  describe("join", () => {
    const data = {
      account: [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ],
      user: [
        { id: 1, accountId: 1, role: Role.ADMIN, uniqueField: "user 1" },
        { id: 2, accountId: 1, role: Role.ADMIN, uniqueField: "user 2" },
        { id: 3, accountId: 2, role: Role.USER, uniqueField: "user 3" },
        { id: 4, accountId: 2, role: Role.ADMIN, uniqueField: "user 4" },
      ],
    }

    test("every", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          users: {
            every: {
              role: Role.ADMIN,
            },
          },
        },
      })
      expect(accounts).toMatchInlineSnapshot(`
Array [
  Object {
    "id": 1,
    "name": "A",
    "sort": null,
  },
  Object {
    "id": 3,
    "name": "C",
    "sort": null,
  },
]
`)
    })
    test("some", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          users: {
            some: {
              role: Role.ADMIN,
            },
          },
        },
      })
      expect(accounts).toMatchInlineSnapshot(`
Array [
  Object {
    "id": 1,
    "name": "A",
    "sort": null,
  },
  Object {
    "id": 2,
    "name": "B",
    "sort": null,
  },
]
`)
      // expect(accounts.length).toEqual(2);
      // expect(accounts).toEqual([data.account[0], data.account[1]]);
    })

    test("none", async () => {
      const client = await createPrismaClient(data)
      const accounts = await client.account.findMany({
        where: {
          users: {
            none: {
              role: Role.ADMIN,
            },
          },
        },
      })
      expect(accounts).toMatchInlineSnapshot(`
Array [
  Object {
    "id": 3,
    "name": "C",
    "sort": null,
  },
]
`)
      // expect(accounts.length).toEqual(1);
      // expect(accounts).toEqual([data.account[2]]);
    })

    // every?: PostWhereInput | null
    // some?: PostWhereInput | null
    // none?: PostWhereInput | null
  })

  describe("null & undefined", () => {
    const data = {
      user: [
        {
          id: 1,
          name: "Henk",
          uniqueField: "user 1",
        },
        {
          id: 2,
          name: undefined,
          uniqueField: "user 2",
        },
      ],
    }

    test("null", async () => {
      const client = await createPrismaClient(data)
      const users = await client.user.findMany({
        where: {
          name: null,
        },
      })
      expect(users.length).toEqual(1)
    })

    test("undefined", async () => {
      const client = await createPrismaClient(data)
      const users = await client.user.findMany({
        where: {
          name: undefined,
        },
      })
      expect(users.length).toEqual(2)
    })
  })
})
