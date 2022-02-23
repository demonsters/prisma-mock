  // @ts-nocheck

import { PrismaClient } from '@prisma/client'
import createPrismaClient from '../src/'

describe('PrismaClient @@unique()', () => {

  test('upsert insert', async () => {
    const client = await createPrismaClient<PrismaClient>({
      user: {
        id: 1,
      }
    })
    
    const newItem1 = await client.element.upsert({
      create: {
        value: "new"
      },
      update: {
        
      },
      where: {
        userId_value: {
          userId: 1,
          value: "new"
        }
      }
    })

    expect(newItem1.userId).toEqual(1)
    expect(newItem1.value).toEqual("new")

    const newItem2 = await client.element.upsert({
      create: {
      },
      update: {
        value: "updated"
      },
      where: {
        userId_value: {
          userId: 1,
          value: "new"
        }
      }
    })

    expect(newItem2.userId).toEqual(1)
    expect(newItem2.value).toEqual("updated")

  })


})