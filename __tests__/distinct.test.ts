// @ts-nocheck

import createPrismaClient from "../src/";
import { PrismaClient } from "@prisma/client";

describe("PrismaClient distinct", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "Piet",
      },
      {
        id: 2,
        name: "Piet",
      },
      {
        id: 3,
        name: "Henk",
      },
      {
        id: 4,
        name: "Henk",
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
