// @ts-nocheck

import createPrismaClientMongo from "./createPrismaClientMongo"

describe("MongoDB schema", () => {
  describe("auto() ObjectId with @map(\"_id\")", () => {
    test("create generates ObjectId", async () => {
      const client = await createPrismaClientMongo({})
      const post = await client.mongoPost.create({
        data: { title: "Test", content: "Content" },
      })
      expect(post.id).toBeDefined()
      expect(post.id).toHaveLength(24)
      expect(post.id).toMatch(/^[0-9a-f]{24}$/)
      expect(post.title).toBe("Test")
    })

    test("createMany then create - id generation works", async () => {
      const client = await createPrismaClientMongo({
        mongoPost: [{ id: "507f1f77bcf86cd799439011", title: "Seeded", content: null }],
      })
      const post = await client.mongoPost.create({
        data: { title: "New", content: "New content" },
      })
      expect(post.id).toBeDefined()
      expect(post.id).toHaveLength(24)
      const all = await client.mongoPost.findMany()
      expect(all).toHaveLength(2)
    })

    test("MongoUser create generates ObjectId", async () => {
      const client = await createPrismaClientMongo({})
      const user = await client.mongoUser.create({
        data: { name: "Alice" },
      })
      expect(user.id).toBeDefined()
      expect(user.id).toHaveLength(24)
      expect(user.name).toBe("Alice")
    })
  })
})
