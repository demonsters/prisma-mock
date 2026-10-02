// @ts-nocheck

import createPrismaClient from "./createPrismaClient"

describe("create", () => {

  test("returns the created row for a model without an @id", async () => {
    const client = await createPrismaClient({})
    await client.setting.create({ data: { key: "theme", value: "dark" } })

    const created = await client.setting.create({ data: { key: "locale", value: "nl" } })

    expect(created).toEqual({ key: "locale", value: "nl" })
    expect(await client.setting.findUnique({ where: { key: "locale" } })).toEqual({ key: "locale", value: "nl" })
  })

  test("returns the created row for a single field @@id", async () => {
    const client = await createPrismaClient({})
    await client.slug.create({ data: { slug: "first", title: "First" } })

    const created = await client.slug.create({ data: { slug: "second", title: "Second" } })

    expect(created).toEqual({ slug: "second", title: "Second" })
    expect(await client.slug.findUnique({ where: { slug: "second" } })).toEqual({ slug: "second", title: "Second" })
  })

  test("a select on create does not limit what later queries return", async () => {
    const client = await createPrismaClient({})

    const created = await client.user.create({
      data: { id: 1, name: "Henk", uniqueField: "1" },
      select: { id: true },
    })

    expect(created).toEqual({ id: 1 })
    expect(await client.user.findUnique({ where: { id: 1 } })).toMatchObject({ id: 1, name: "Henk", uniqueField: "1" })
  })

  test("an include on create is not kept on the row", async () => {
    const client = await createPrismaClient({ user: [{ id: 1, name: "Henk", uniqueField: "1" }] })

    const created = await client.pet.create({ data: { id: 1, name: "Rex", ownerId: 1 }, include: { owner: true } })

    expect(created.owner).toMatchObject({ id: 1, name: "Henk" })
    expect(await client.pet.findUnique({ where: { id: 1 } })).toEqual({ id: 1, name: "Rex", ownerId: 1 })
  })
})
