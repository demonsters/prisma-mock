// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// Without indexes, every lookup by id, compound key or foreign key matched every row of the
// table, so looking each row up, or including a relation for every row, cost O(rows ^ 2).
// They are now answered from the rows the delegate files by value.
const NUM_ROWS = 5000

// CI has run the include ~20x slower than a laptop (488ms against ~25ms), more than the
// 4-6x of the other tests. The previous implementation needs 2-3.3s even locally.
const THRESHOLD_MS = 1000

const seed = async () => {
  const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "u1" }] }, { enableIndexes: false })
  await client.pet.createMany({
    data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, name: `pet-${i + 1}`, ownerId: 1 })),
  })
  await client.toy.createMany({
    data: Array.from({ length: NUM_ROWS }, (_, i) => ({ id: i + 1, name: `toy-${i + 1}`, ownerId: i + 1 })),
  })
  return client
}

const time = async (fn) => {
  const start = performance.now()
  await fn()
  return performance.now() - start
}

describe("lookups without indexes", () => {

  test("findUnique by id stays fast", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < NUM_ROWS; i++) {
        await client.toy.findUnique({ where: { id: i + 1 } })
      }
    })
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("findUnique by a compound key stays fast", async () => {
    const client = await seed()
    const duration = await time(async () => {
      for (let i = 0; i < NUM_ROWS; i++) {
        await client.pet.findUnique({ where: { name_ownerId: { name: `pet-${i + 1}`, ownerId: 1 } } })
      }
    })
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("including a relation for every row stays fast", async () => {
    const client = await seed()
    let pets
    const duration = await time(async () => {
      pets = await client.pet.findMany({ include: { has: true } })
    })
    expect(pets.every((pet) => pet.has.length === 1)).toBe(true)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
