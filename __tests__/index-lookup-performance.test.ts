// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// A lookup that finds nothing, or that filters with equals or in, used to scan the whole
// table even with indexes enabled: 5000 of them over 5000 rows took 3-4s locally. Answered
// from the index they take 4-9ms.
const NUM_ROWS = 5000

// Generous enough to stay green on CI, which runs 4-6x slower than a laptop, and still
// far below what the scans needed locally
const THRESHOLD_MS = 300

const seed = async () => {
  const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }], pet: [{ id: 1, name: "Rex", ownerId: 1 }] })
  await client.toy.createMany({
    data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, name: `toy-${i + 1}`, ownerId: 1 })),
  })
  return client
}

const time = async (fn) => {
  const start = performance.now()
  await fn()
  return performance.now() - start
}

describe("index lookup performance", () => {

  test("lookups that find nothing stay fast", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < NUM_ROWS; i++) {
        await client.toy.findUnique({ where: { id: NUM_ROWS + i + 1 } })
      }
    })
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("lookups with equals stay fast", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < NUM_ROWS; i++) {
        await client.toy.findMany({ where: { id: { equals: i + 1 } } })
      }
    })
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
