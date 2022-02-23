// @ts-nocheck

import createPrismaClient from "../src";
import { PrismaClient } from "@prisma/client";


describe("PrismaClient select", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "sadfsdf",
        accountId: 1,
      },
    ],
    account: [
      {
        id: 1,
        name: "sadfsdf",
      },
      {
        id: 2,
        name: "adsfasdf2",
      },
    ],
    stripe: [
      {
        id: 1,
        accountId: 1,
      },
    ],
  };

  test("findOne to", async () => {
    const client = await createPrismaClient(data);
    const user = await client.user.findUnique({
      where: {
        id: 1,
      },
      select: {
        id: 1,
        account: true,
      },
    });
    expect(user).toEqual({
      id: data.user[0].id,
      account: data.account[0],
    });
  });

});
