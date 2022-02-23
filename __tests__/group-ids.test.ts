// @ts-nocheck

import createPrismaClient from '../src/'


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

  test('upsert update', async () => {
    
  })

  test('upsert insert', async () => {
    const client = await createPrismaClient(data)
    
    const newItem = await client.userAnswers.upsert({
      create: {
        value: "created"
      },
      update: {
        value: "updated"
      },
      where: {
        copyId_langId: {
          userId: 1,
          answerId: 1
        },
      },
    })
    const userAnswers = await client.userAnswers.findMany({})
    expect(userAnswers.length).toEqual(2)
    expect(newItem.value).toEqual("created")
  })

  test.todo("connect")
  test.todo('should throw when there is a duplicate')
})