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

// Toys spread over pets, each toy named after its pet, so a where on the foreign key and one
// on the name match the same rows
const NUM_PETS = 500
const TOYS_PER_PET = 10

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

const seedOwners = async (numPets, toysPerPet) => {
  const client = await createPrismaClient({})
  await client.user.create({ data: { id: 1, name: "user-1", uniqueField: "user-1" } })
  await client.pet.createMany({
    data: Array.from({ length: numPets }, (_, i) => ({ id: i + 1, name: `pet-${i + 1}`, ownerId: 1 })),
  })
  await client.toy.createMany({
    data: Array.from({ length: numPets * toysPerPet }, (_, i) => ({ id: i + 1, name: `pet-${(i % numPets) + 1}`, ownerId: (i % numPets) + 1 })),
  })
  return client
}

const timeRuns = async (seed, run) => {
  const times = []
  for (let i = 0; i < 3; i++) {
    const client = await seed()
    const start = performance.now()
    await run(client)
    times.push(performance.now() - start)
  }
  return median(times)
}

const deleteEveryPet = (where) => async (client) => {
  for (let i = 1; i <= NUM_PETS; i++) {
    const { count } = await client.toy.deleteMany({ where: where(i) })
    expect(count).toBe(TOYS_PER_PET)
  }
  expect(await client.toy.count()).toBe(0)
}

describe("deleteMany performance by where", () => {

  // deleteMany takes the rows holding the values a where pins a foreign key to, instead of
  // matching every row: 500 calls emptying a table of 5000 rows take ~25ms, against ~250ms
  // for the same calls by the name, which can't do better than a scan. Both are measured in
  // the same run, so this holds however fast the machine is: about 0.1 now, about 1 when
  // every row is matched
  test("a where on a foreign key costs a fraction of matching every row", async () => {
    const seed = () => seedOwners(NUM_PETS, TOYS_PER_PET)
    const byKey = await timeRuns(seed, deleteEveryPet((i) => ({ ownerId: i })))
    const byName = await timeRuns(seed, deleteEveryPet((i) => ({ name: `pet-${i}` })))
    expect(byKey / byName).toBeLessThan(0.3)
  }, 30_000)

  // A where on a field that isn't a key is matched against every row, so it can't get faster
  // than one pass over the table. Three times the rows take about three times as long while
  // that holds, and closer to nine times as long when the cost grows quadratically
  test("a where on another field grows linearly with the number of rows", async () => {
    const deleteHalf = async (client) => {
      const { count } = await client.toy.deleteMany({ where: { name: { in: Array.from({ length: 50 }, (_, i) => `pet-${i * 2 + 1}`) } } })
      expect(count).toBeGreaterThan(0)
    }
    const small = await timeRuns(() => seedOwners(100, 100), deleteHalf)
    const large = await timeRuns(() => seedOwners(100, 300), deleteHalf)
    expect(large / small).toBeLessThan(5)
  }, 30_000)
})
