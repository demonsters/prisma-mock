// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// updateMany used to read back the rows it changed with a findMany holding one
// where clause per changed row, so every row was matched against every clause,
// O(rows ^ 2). For 3000 rows that took ~590ms, against ~3ms when the changed
// rows are picked by position.
const NUM_TOYS = 3000

// Generous enough to stay green on a loaded CI machine, but far below what the
// previous implementation needed
const THRESHOLD_MS = 150

const seed = async () => {
  const client = await createPrismaClient({})
  await client.user.create({ data: { id: 1, name: "user-1", uniqueField: "user-1" } })
  await client.pet.create({ data: { id: 1, name: "pet-1", ownerId: 1 } })
  await client.toy.createMany({
    data: Array.from({ length: NUM_TOYS }, (_, i) => ({ id: i + 1, name: `toy-${i + 1}`, ownerId: 1 })),
  })
  return client
}

describe("updateMany performance", () => {

  test("updateMany stays fast when it changes thousands of rows", async () => {
    const client = await seed()

    const start = performance.now()
    const { count } = await client.toy.updateMany({ where: {}, data: { name: "updated" } })
    const duration = performance.now() - start

    expect(count).toBe(NUM_TOYS)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })

  test("updateManyAndReturn stays fast when it changes thousands of rows", async () => {
    const client = await seed()

    const start = performance.now()
    const toys = await client.toy.updateManyAndReturn({ where: {}, data: { name: "updated" } })
    const duration = performance.now() - start

    expect(toys).toHaveLength(NUM_TOYS)
    expect(toys.every((toy) => toy.name === "updated")).toBe(true)
    expect(duration).toBeLessThan(THRESHOLD_MS)
  })
})
