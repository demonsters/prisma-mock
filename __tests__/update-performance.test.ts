// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// update matched its where against every row and then searched the table again for the row
// it changed, using all of that row's fields as the where clause, so a loop of updates cost
// O(rows ^ 2). For 3000 rows that took 1.3s (2.4s without indexes), against ~12ms with the
// row a unique where points at looked up and read back by position.
const NUM_ROWS = 3000

// CI runs this 4-6x slower than a laptop. The previous implementation needs seconds
// there, and over a second locally.
const THRESHOLD_MS = 1000

describe("update performance", () => {

  test("stays fast when every row is updated one by one", async () => {
    const client = await createPrismaClient({})
    await client.user.createMany({
      data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, uniqueField: `user-${i + 1}` })),
    })

    const start = performance.now()
    for (let i = 0; i < NUM_ROWS; i++) {
      await client.user.update({ where: { uniqueField: `user-${i + 1}` }, data: { name: `name-${i + 1}` } })
    }
    const duration = performance.now() - start

    expect(await client.user.count({ where: { name: { startsWith: "name-" } } })).toBe(NUM_ROWS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
