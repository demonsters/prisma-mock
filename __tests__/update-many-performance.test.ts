// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// updateMany used to read back the rows it changed with a findMany holding one
// where clause per changed row, so every row was matched against every clause,
// O(rows ^ 2). For 3000 rows that took ~590ms, against ~3ms when the changed
// rows are picked by position.
const NUM_TOYS = 3000

// CI runs this 4-6x slower than a laptop. The previous implementation needs seconds
// there.
const THRESHOLD_MS = 1000

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

const updateEveryPet = (where) => async (client) => {
  for (let i = 1; i <= NUM_PETS; i++) {
    const { count } = await client.toy.updateMany({ where: where(i), data: { name: `pet-${i}` } })
    expect(count).toBe(TOYS_PER_PET)
  }
}

describe("updateMany performance by where", () => {

  // updateMany matched every row of the table on every call, also when the where pins a
  // foreign key, which now takes the rows holding that value. Here 500 calls on 5000 rows
  // take ~35ms by the foreign key (~375ms before), against ~450ms by the name, which can't
  // do better than a scan. Both are measured in the same run, so this holds however fast the
  // machine is: under 0.1 now, about 0.9 when every row is matched
  test("a where on a foreign key costs a fraction of matching every row", async () => {
    const seed = () => seedOwners(NUM_PETS, TOYS_PER_PET)
    const byKey = await timeRuns(seed, updateEveryPet((i) => ({ ownerId: i })))
    const byName = await timeRuns(seed, updateEveryPet((i) => ({ name: `pet-${i}` })))
    expect(byKey / byName).toBeLessThan(0.3)
  }, 30_000)

  // A where on a field that isn't a key is matched against every row, so it can't get faster
  // than one pass over the table. Three times the rows take about three times as long while
  // that holds, and closer to nine times as long when the cost grows quadratically
  test("a where on another field grows linearly with the number of rows", async () => {
    const updateHalf = async (client) => {
      const { count } = await client.toy.updateMany({ where: { name: { in: Array.from({ length: 50 }, (_, i) => `pet-${i * 2 + 1}`) } }, data: { name: "updated" } })
      expect(count).toBeGreaterThan(0)
    }
    const small = await timeRuns(() => seedOwners(100, 100), updateHalf)
    const large = await timeRuns(() => seedOwners(100, 300), updateHalf)
    expect(large / small).toBeLessThan(5)
  }, 30_000)
})
