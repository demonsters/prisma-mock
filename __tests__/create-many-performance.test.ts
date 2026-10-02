// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// Every create used to scan the whole table once per unique field and compound key to
// check for duplicates, and models with a compound key rebuilt every row on each write,
// so filling a table cost O(rows ^ 2). For 3000 rows that took 1.2s (User, @unique) to
// 2.1s (Pet, @@unique), against under 50ms with the duplicates looked up in a Set.
const NUM_ROWS = 3000

// Generous enough to stay green on a loaded CI machine, but far below what the
// previous implementation needed
const THRESHOLD_MS = 300

describe("createMany performance", () => {

  test("stays fast for a model with a @unique field", async () => {
    const client = await createPrismaClient({})

    const start = performance.now()
    const { count } = await client.user.createMany({
      data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, uniqueField: `user-${i + 1}` })),
    })
    const duration = performance.now() - start

    expect(count).toBe(NUM_ROWS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("stays fast for a model with a @@unique", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "user-1" }] })

    const start = performance.now()
    const { count } = await client.pet.createMany({
      data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, name: `pet-${i + 1}`, ownerId: 1 })),
    })
    const duration = performance.now() - start

    expect(count).toBe(NUM_ROWS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("stays fast when rows are created one by one", async () => {
    const client = await createPrismaClient({})

    const start = performance.now()
    for (let i = 0; i < NUM_ROWS; i++) {
      await client.setting.create({ data: { key: `key-${i + 1}`, value: "value" } })
    }
    const duration = performance.now() - start

    expect(await client.setting.count()).toBe(NUM_ROWS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
