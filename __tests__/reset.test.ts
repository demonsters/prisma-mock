// @ts-nocheck

import { PrismaClient } from "@prisma/client"
import createPrismaMock from "../src"

describe("$reset", () => {
  const defaultData = {
    user: [{ id: 1, name: 'Henk', clicks: 2, uniqueField: 'user 1' }],
  }

  const client = createPrismaMock<PrismaClient>(defaultData);

  test("$reset resets to initial state and data", async () => {
    let user = await client.user.create({
      data: {
        name: "New user",
        uniqueField: "new",
      },
    });
    expect(user.id).toBe(2);

    client.$reset();
    const users = await client.user.findMany();
    expect(users).toHaveLength(1);

    user = await client.user.create({
      data: {
        name: "New user",
        uniqueField: "new",
      },
    });
    expect(user.id).toBe(2);
  });
});
