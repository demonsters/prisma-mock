// @ts-nocheck

import createPrismaClient from "./createPrismaClient";


describe("prisma.$transaction", () => {
  const data = {
    account: [
      { id: 1, name: "Account 1" },
      { id: 2, name: "Account 2" },
      { id: 3, name: "Account 3" },
    ],
    user: [
      {
        id: 1,
        name: "Henk",
        accountId: 1,
        uniqueField: "henk",
      },
      {
        id: 2,
        name: "Dirk",
        accountId: 2,
        uniqueField: "dirk",
      },
    ]
  };

  test("gets the values from $transaction", async () => {
    const client = await createPrismaClient(data);

    const [henks, totalUsers] = await client.$transaction([
      client.user.findMany({ where: { name: { contains: "Henk" } } }),
      client.user.count(),
    ]);

    expect(henks[0].accountId).toEqual(1);
    expect(totalUsers).toEqual(2);
  });

  test("interactive failed", async () => {
    const client = await createPrismaClient(data);
    let failed = false;

    try {
      await client.$transaction(async tx => {
        tx.user.create({
          data: {
            id: 3,
            name: 'Anonymous',
            accountId: 3,
            uniqueField: 'anonymous',
          }
        })
        throw new Error('failed')
      })
    } catch (error) {
      failed = true;
      expect(error.message).toEqual('failed');
    }

    const allUsers = await client.user.findMany()

    expect(failed).toBeTruthy();
    expect(allUsers).toHaveLength(2)
  })

  test("interactive succeeded", async () => {
    const client = await createPrismaClient(data);

    const result = await client.$transaction(async tx => {
      await tx.user.create({
        data: {
          id: 3,
          name: 'Anonymous',
          accountId: 3,
          uniqueField: 'anonymous',
        }
      })
      return 'success';
    })

    const allUsers = await client.user.findMany()

    expect(allUsers).toHaveLength(3)
    expect(result).toEqual('success');
  })

  test("restore date values", async () => {
    const client = await createPrismaClient(data);

    const original = await client.post.create({
      data: {
        title: 'Hello, world!',
      }
    });
    try {
      await client.$transaction(() => {
        throw 'rollback';
      });
    } catch { }

    const actual = await client.post.findFirst();
    expect(JSON.stringify(original)).toBe(JSON.stringify(actual));
  })
});
