// @ts-nocheck

import createPrismaClient from '../src'


describe('PrismaClient @@id()', () => {

  const data = {
    user: [
      {
        id: 1,
        name: 'sadfsdf',
      }
    ],
    userAnswers: [
      {
        userId: 1,
        answerId: 2
      }
    ],
    answers: [
      {
        id: 1,
        title: "Answer"
      },
      {
        id: 2,
        title: "Answer"
      },
      {
        id: 3,
        title: "Answer"
      }
    ],
  }

  test('findOne', async () => {
    const client = await createPrismaClient(data)
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 2
        }
      },
    })
    expect(user).toEqual(expect.objectContaining(data.userAnswers[0]))
  })

  test('findOne NOT found', async () => {
    const client = await createPrismaClient(data)
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 2,
          answerId: 2
        }
      },
    })
    expect(user).toBe(null)
  })

  test('create', async () => {
    const client = await createPrismaClient(data)
    await client.userAnswers.create({
      data: {
        user: { connect: { id: 1 }},
        answer: { connect: { id: 1 }},
      }
    })
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 1
        }
      },
    })
    expect(user).toEqual(expect.objectContaining({
      userId_answerId: {
        userId: 1,
        answerId: 1
      }
    }))
    
  })

  test('delete', async () => {
    
  })

  test('update', async () => {
    
  })

  test('upsert insert', async () => {
    const client = await createPrismaClient(data)
    
    const newItem1 = await client.userAnswers.upsert({
      create: {
        value: "created"
      },
      update: {
        value: "updated"
      },
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 1
        },
      },
    })
    expect(newItem1.userId_answerId.answerId).toEqual(1)
    expect(newItem1.value).toEqual("created")


    const newItem3 = await client.userAnswers.upsert({
      create: {
        value: "created"
      },
      update: {
        value: "updated"
      },
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 3
        },
      },
    })
    expect(newItem3.userId_answerId.answerId).toEqual(3)
    expect(newItem3.value).toEqual("created")

    // const userAnswers = await client.userAnswers.findMany({}) //?
    // expect(userAnswers.length).toEqual(2)
    // 

    // const found = await client.userAnswers.findUnique({
    //   where: {
    //     userId_answerId: {
    //       userId: 1,
    //       answerId: 1
    //     },
    //   },
    // })
    // expect(found.userId).toEqual(1)

  })


  test('upsert update', async () => {
    
  })


  test.todo("connect")
  test.todo('should throw when there is a duplicate')
})