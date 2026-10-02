// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// delete looked the row up with a findOne and then ran deleteMany, which matched every row
// of the table, so deleting rows one by one cost O(rows ^ 2). The row a unique where points
// at is now looked up, and taken out of a copy of the table.
const NUM_ROWS = 5000

// Generous enough to stay green on CI, which runs 4-6x slower than a laptop, and still
// below what the previous implementation needed locally
const THRESHOLD_MS = 1000

describe("delete performance", () => {

  test("stays fast when every row is deleted one by one", async () => {
    const client = await createPrismaClient({})
    await client.user.createMany({
      data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, uniqueField: `user-${i + 1}` })),
    })

    const start = performance.now()
    for (let i = 0; i < NUM_ROWS; i++) {
      await client.user.delete({ where: { id: i + 1 } })
    }
    const duration = performance.now() - start

    expect(await client.user.count()).toBe(0)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
