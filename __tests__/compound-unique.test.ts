  // @ts-nocheck

import { PrismaClient, PrismaClientValidationError } from '@prisma/client'
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

describe("PrismaClient @@unique() with a custom name", () => {
  const data = {
    organization: [{ name: "Org 1" }, { name: "Org 2" }],
    organizationUser: [
      { organizationId: 1, userId: 1, role: "admin" },
      { organizationId: 1, userId: 2, role: "member" },
    ],
  }

  test("findUnique", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.findUnique({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 1,
          userId: 2,
        },
      },
    })
    expect(item).toEqual({ id: 2, organizationId: 1, userId: 2, role: "member" })
  })

  test("findUnique not found", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.findUnique({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 2,
          userId: 2,
        },
      },
    })
    expect(item).toBeNull()
  })

  test("findUniqueOrThrow", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.findUniqueOrThrow({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 1,
          userId: 1,
        },
      },
    })
    expect(item.role).toEqual("admin")

    await expect(
      client.organizationUser.findUniqueOrThrow({
        where: {
          OrganizationUser_organizationId_userId_key: {
            organizationId: 2,
            userId: 1,
          },
        },
      })
    ).rejects.toMatchObject({ code: "P2025" })
  })

  test("the default name does not match", async () => {
    const client = await createPrismaClient(data)
    const query = client.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: 1,
          userId: 2,
        },
      },
    })
    if (process.env.PROVIDER === "postgresql") {
      await expect(query).rejects.toThrow(PrismaClientValidationError)
    } else {
      await expect(query).resolves.toBeNull()
    }
  })

  test("update", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.update({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 1,
          userId: 2,
        },
      },
      data: { role: "owner" },
    })
    expect(item).toEqual({ id: 2, organizationId: 1, userId: 2, role: "owner" })

    const other = await client.organizationUser.findUnique({ where: { id: 1 } })
    expect(other.role).toEqual("admin")
  })

  test("upsert insert", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.upsert({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 2,
          userId: 1,
        },
      },
      create: { organizationId: 2, userId: 1, role: "created" },
      update: { role: "updated" },
    })
    expect(item).toEqual({ id: 3, organizationId: 2, userId: 1, role: "created" })

    const found = await client.organizationUser.findUnique({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 2,
          userId: 1,
        },
      },
    })
    expect(found).toEqual(item)
    expect(await client.organizationUser.count()).toEqual(3)
  })

  test("upsert update", async () => {
    const client = await createPrismaClient(data)
    const item = await client.organizationUser.upsert({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 1,
          userId: 2,
        },
      },
      create: { organizationId: 1, userId: 2, role: "created" },
      update: { role: "updated" },
    })
    expect(item).toEqual({ id: 2, organizationId: 1, userId: 2, role: "updated" })
    expect(await client.organizationUser.count()).toEqual(2)
  })

  test("delete", async () => {
    const client = await createPrismaClient(data)
    const deleted = await client.organizationUser.delete({
      where: {
        OrganizationUser_organizationId_userId_key: {
          organizationId: 1,
          userId: 1,
        },
      },
    })
    expect(deleted).toEqual({ id: 1, organizationId: 1, userId: 1, role: "admin" })

    const items = await client.organizationUser.findMany()
    expect(items).toEqual([{ id: 2, organizationId: 1, userId: 2, role: "member" }])
  })

  test("connect in a nested write", async () => {
    const client = await createPrismaClient(data)
    const organization = await client.organization.create({
      data: {
        name: "Org 3",
        members: {
          connect: {
            OrganizationUser_organizationId_userId_key: {
              organizationId: 1,
              userId: 2,
            },
          },
        },
      },
    })

    const members = await client.organizationUser.findMany({
      where: { organizationId: organization.id },
    })
    expect(members).toEqual([{ id: 2, organizationId: organization.id, userId: 2, role: "member" }])
  })

  test("create duplicate throws P2002", async () => {
    const client = await createPrismaClient(data)
    try {
      await client.organizationUser.create({
        data: { organizationId: 1, userId: 2 },
      })
      throw new Error("Should have thrown")
    } catch (e) {
      expect(e.code).toBe("P2002")
      expect(e.meta.modelName).toBe("OrganizationUser")
      expect(e.meta.target).toEqual(["organizationId", "userId"])
    }
  })
})
