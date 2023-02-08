// @ts-nocheck

import createPrismaClient from "../src";

describe("prisma.$transaction", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "Henk",
        accountId: 1,
      },
      {
        id: 2,
        name: "Dirk",
        accountId: 2,
      },
    ]
  };

  test("gets the values from $transaction", async () => {
    const client = createPrismaClient(data);

    const [henks, totalUsers] = await client.$transaction([
      client.user.findMany({ where: { name: { contains: "Henk" } } }),
      client.user.count(),
    ]);
  
    expect(henks[0].accountId).toEqual(1);
    expect(totalUsers).toEqual(2);
  });
});
