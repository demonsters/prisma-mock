
import createPrismaClient from './createPrismaClient'

const setup = async () => {
  return await createPrismaClient({
    user: [
      { id: 1, age: 25, uniqueField: "1" },
      { id: 2, age: 30, uniqueField: "2" },
      { id: 3, age: 35, uniqueField: "3" },
      { id: 4, age: 40, uniqueField: "4" },
    ],
  })
}

it("Should return the count of the rows with _count: true", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    where: { age: { gt: 25 } },
    _count: true,
  })

  expect(result._count).toBe(3)
})

it("Should leave out nulls from the count of a field", async () => {
  const client = await createPrismaClient({
    user: [
      { id: 1, uniqueField: "1", clicks: 1 },
      { id: 2, uniqueField: "2", clicks: null },
      { id: 3, uniqueField: "3", clicks: 3 },
    ],
  })

  const result = await client.user.aggregate({
    _count: {
      _all: true,
      clicks: true,
    },
  })

  expect(result._count).toEqual({ _all: 3, clicks: 2 })
})


it("Should return the average of the numbers", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    _avg: {
      age: true,
    },
  })

  expect(result._avg.age).toBe(32.5)
})

it("Should return the sum of the numbers", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    _sum: {
      age: true,
    },
  })

  expect(result._sum.age).toBe(130)
})

it("Should return the count of the numbers", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    _count: {
      age: true,
    },
  })

  expect(result._count.age).toBe(4)
})

it("Should return the min of the numbers", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    _min: {
      age: true,
    },
  })

  expect(result._min.age).toBe(25)
})

it("Should return the max of the numbers", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    _max: {
      age: true,
    },
  })

  expect(result._max.age).toBe(40)
})