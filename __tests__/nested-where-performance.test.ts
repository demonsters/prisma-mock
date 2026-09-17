// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// Matching a where clause that traverses relations used to re-evaluate the whole
// nested filter for every candidate row at every level, which costs roughly
// O(rows ^ depth). These queries walk six relations:
//
//   Toy -> Pet -> User -> Account -> User -> UserAnswers -> Answers
//
// On this dataset that used to take 16s at depth 6, growing ~6x per added level.
const NUM_TOYS = 34
const NUM_PETS = 20
const NUM_USERS = 12
const NUM_ACCOUNTS = 5
const NUM_ANSWERS = 4

// The blow-up is only visible without the index lookups, which happen to short
// circuit a foreign key join but do nothing for the nested filter itself.
const seed = async (options) => {
  const client = await createPrismaClient({}, options)
  await client.account.createMany({
    data: Array.from({ length: NUM_ACCOUNTS }, (_, i) => ({ id: i + 1, name: `account-${i + 1}` })),
  })
  await client.user.createMany({
    data: Array.from({ length: NUM_USERS }, (_, i) => ({
      id: i + 1,
      uniqueField: `user-${i + 1}`,
      name: `user-${i + 1}`,
      accountId: (i % NUM_ACCOUNTS) + 1,
    })),
  })
  await client.answers.createMany({
    data: Array.from({ length: NUM_ANSWERS }, (_, i) => ({ id: i + 1, title: `answer-${i + 1}` })),
  })
  await client.userAnswers.createMany({
    data: Array.from({ length: NUM_USERS }, (_, i) => ({
      userId: i + 1,
      answerId: (i % NUM_ANSWERS) + 1,
      value: `value-${i + 1}`,
    })),
  })
  await client.pet.createMany({
    data: Array.from({ length: NUM_PETS }, (_, i) => ({
      id: i + 1,
      name: `pet-${i + 1}`,
      ownerId: (i % NUM_USERS) + 1,
    })),
  })
  await client.toy.createMany({
    data: Array.from({ length: NUM_TOYS }, (_, i) => ({
      id: i + 1,
      name: `toy-${i + 1}`,
      ownerId: (i % NUM_PETS) + 1,
    })),
  })
  return client
}

const depths = [
  ["1: pet", { owner: { name: { startsWith: "pet-" } } }],
  ["2: + user", { owner: { owner: { name: { startsWith: "user-" } } } }],
  ["3: + account", { owner: { owner: { account: { name: { startsWith: "account-" } } } } }],
  ["4: + account.users", { owner: { owner: { account: { users: { some: { name: { startsWith: "user-" } } } } } } }],
  ["5: + users.answers", { owner: { owner: { account: { users: { some: { answers: { some: { value: { startsWith: "value-" } } } } } } } } }],
  ["6: + answers.answer", { owner: { owner: { account: { users: { some: { answers: { some: { answer: { title: { startsWith: "answer-" } } } } } } } } } }],
]

// Generous enough to stay green on a loaded CI machine, but far below the 3.4s
// (depth 5) and 16s (depth 6) the previous implementation needed.
const THRESHOLD_MS = 500

describe("nested where performance", () => {

  test("stays fast when the filter nests six relations deep", async () => {
    const client = await seed({ enableIndexes: false })
    const timings = []

    for (const [label, where] of depths) {
      const start = performance.now()
      const res = await client.toy.findMany({ where })
      const duration = performance.now() - start
      timings.push(`${label}: ${duration.toFixed(2)}ms`)
      // every toy is reachable through the whole chain, so nothing is filtered out
      expect(res.length).toBe(NUM_TOYS)
      expect(duration).toBeLessThan(THRESHOLD_MS)
    }

    console.log(timings.join("\n"))
  })

  test("stays fast with indexes enabled", async () => {
    const client = await seed({ enableIndexes: true })
    const [, deepest] = depths[depths.length - 1]

    const start = performance.now()
    const res = await client.toy.findMany({ where: deepest })
    const duration = performance.now() - start

    expect(res.length).toBe(NUM_TOYS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("returns the same rows as the equivalent shallow queries", async () => {
    const client = await seed({ enableIndexes: false })

    // Only user-1 answered answer-1, and only pet-1/pet-13 belong to user-1
    const res = await client.toy.findMany({
      where: {
        owner: {
          owner: {
            account: {
              users: {
                some: { answers: { some: { answer: { title: "answer-1" } } } },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    })

    const accounts = await client.account.findMany({
      where: { users: { some: { answers: { some: { answer: { title: "answer-1" } } } } } },
    })
    const accountIds = accounts.map((account) => account.id)
    const users = await client.user.findMany({ where: { accountId: { in: accountIds } } })
    const pets = await client.pet.findMany({ where: { ownerId: { in: users.map((user) => user.id) } } })
    const expected = await client.toy.findMany({
      where: { ownerId: { in: pets.map((pet) => pet.id) } },
      orderBy: { id: "asc" },
    })

    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length).toBeLessThan(NUM_TOYS)
    expect(res).toEqual(expected)
  })
})
