// @ts-nocheck

import createPrismaClient from "./createPrismaClient";
import { PrismaClient } from "@prisma/client";

describe("PrismaClient distinct", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "Piet",
        uniqueField: "user1",
      },
      {
        id: 2,
        name: "Piet",
        uniqueField: "user2",
      },
      {
        id: 3,
        name: "Henk",
        uniqueField: "user3",
      },
      {
        id: 4,
        name: "Henk",
        uniqueField: "user4",
      },
    ],
  };

  test("distinct", async () => {
    const client = await createPrismaClient(data);
    let users = await client.user.findMany({
      distinct: ['id']
    });
    expect(users.length).toBe(4);
    users = await client.user.findMany({
      distinct: ['name']
    });
    expect(users.length).toBe(2);
  });

});
