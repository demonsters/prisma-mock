// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// findFirst built every matching row of the table to return the first, and an interactive
// transaction copied all of the data before running. With 5000 rows both cost ~1s or more
// here; findFirst now stops at the first match, and a transaction keeps the data by reference.
const NUM_ROWS = 5000

// Generous enough to stay green on CI, which runs 4-6x slower than a laptop, and still
// below what the previous implementation needed locally
const THRESHOLD_MS = 300

const seed = async () => {
  const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }], pet: [{ id: 1, name: "Rex", ownerId: 1 }] })
  await client.toy.createMany({
    data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, name: i === 0 ? "first" : "toy", ownerId: 1 })),
  })
  return client
}

const time = async (fn) => {
  const start = performance.now()
  await fn()
  return performance.now() - start
}

describe("findFirst and transaction performance", () => {

  test("findFirst stays fast when the first row matches", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < NUM_ROWS; i++) {
        await client.toy.findFirst({ where: { name: { startsWith: "first" } } })
      }
    })
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("interactive transactions stay fast however much data there is", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < 500; i++) {
        await client.$transaction(async (tx) => tx.toy.update({ where: { id: i + 1 }, data: { name: "updated" } }))
      }
    })
    expect(await client.toy.count({ where: { name: "updated" } })).toBe(500)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
