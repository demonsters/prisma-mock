
import createPrismaClient from "./createPrismaClient"

test("#22", async () => {
  const prismaMock = await createPrismaClient()

  // Create a page and user
  const user1 = await prismaMock.user.create({
    data: {
      uniqueField: "1"
    },
  })

  // Create a second page and user
  const user2 = await prismaMock.user.create({
    data: {
      uniqueField: "2"
    },
  })

  // Create a third page and user
  await prismaMock.user.create({
    data: {
      uniqueField: "3"
    },
  })

  // user3 blocks user2
  // If we comment this out it works as expected
  await prismaMock.element.create({
    data: {
      value: "1",
      user: {
        connect: {
          id: user1.id,
        },
      },
    },
  })

  // Check if user1 is blocked by user2
  const element = await prismaMock.element.findMany({
    where: {
      user: {
        id: user2.id,
      },
    },
    include: {
      user: true,
    },
  })

  expect(element).toMatchInlineSnapshot(`[]`)
})