
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
it("Should return the min and max of a DateTime as a Date", async () => {
  const client = await createPrismaClient({
    post: [
      { id: 1, title: "A", created: new Date("2026-01-02T00:00:00Z") },
      { id: 2, title: "B", created: new Date("2026-01-01T00:00:00Z") },
      { id: 3, title: "C", created: new Date("2026-01-03T00:00:00Z") },
    ],
  })

  const result = await client.post.aggregate({
    _min: { created: true },
    _max: { created: true },
  })

  expect(result._min.created).toEqual(new Date("2026-01-01T00:00:00Z"))
  expect(result._max.created).toEqual(new Date("2026-01-03T00:00:00Z"))
})

it("Should return the min and max of a String", async () => {
  const client = await createPrismaClient({
    post: [
      { id: 1, title: "b" },
      { id: 2, title: "a" },
      { id: 3, title: "c" },
    ],
  })

  const result = await client.post.aggregate({
    _min: { title: true },
    _max: { title: true },
  })

  expect(result._min.title).toBe("a")
  expect(result._max.title).toBe("c")
})

it("Should return null as the min and max when no rows match", async () => {
  const client = await setup()

  const result = await client.user.aggregate({
    where: { age: { gt: 100 } },
    _min: { age: true },
    _max: { age: true },
  })

  expect(result._min.age).toBeNull()
  expect(result._max.age).toBeNull()
})
