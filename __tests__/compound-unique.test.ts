  // @ts-nocheck

import { PrismaClient } from '@prisma/client'
import createPrismaClient from './createPrismaClient'

describe('PrismaClient @@unique()', () => {

  test('upsert insert', async () => {
    const client = await createPrismaClient<PrismaClient>({
      user: [{
        id: 1,
        uniqueField: "user"
      }]
    })
    
    const newItem1 = await client.element.upsert({
      create: {
        value: "new",
        userId: 1
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
        value: "newer",
        userId: 1,
        value: "new"
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