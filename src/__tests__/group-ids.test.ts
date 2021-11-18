// @ts-nocheck

import createPrismaClient from '../'
import { PrismaClient } from '@prisma/client'


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
    
  })

  test.todo("connect")
  test.todo('should throw when there is a duplicate')
})