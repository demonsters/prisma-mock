import createPrismaClient from "./createPrismaClient"


test.skip("performance test", async () => {
  const client = await createPrismaClient()
  performance.mark("start-create")
  for (let i = 0; i < 50; i++) {
    await client.user.create({
      data: {
        uniqueField: `${i}`,
        account: {
          create: {
            name: "client",
            stripe: {
              create: {
                customerId: `${i}`
              }
            }
          }
        }
      }
    })
  }
  performance.mark("end-create")
  performance.mark("start-find")
  const dummyFunction = async () => {
    const slides = await client.user.findMany({
      where: {
        account: {
          stripe: {
            customerId: "1",
          }
        }
      },
      orderBy: {
        account: {
          stripe: {
            customerId: "asc"
          }
        }
      },
      include: {
        account: {
          include: {
            stripe: true
          }
        }
      }
    })
    return slides
  }
  await dummyFunction()

  performance.mark("end-find")

  const createDuration = performance.measure("create", "start-create", "end-create").duration
  const findDuration = performance.measure("find", "start-find", "end-find").duration

  console.log(createDuration)
  console.log(findDuration)

  expect(findDuration < 100).toBe(true)

  // await expect(dummyFunction).toBeFasterThan(300)
})