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

  test("interactive failed", async () => {
    const client = createPrismaClient(data);
    let failed = false;

    try {
      await client.$transaction(async tx => {
        tx.user.create({ data: {
          id: 3,
          name: 'Anonymous',
          accountId: 3
        }})
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
    const client = createPrismaClient(data);

    const result = await client.$transaction(async tx => {
      tx.user.create({ data: {
        id: 3,
        name: 'Anonymous',
        accountId: 3
      }})
      return 'success';
    })

    const allUsers = await client.user.findMany()

    expect(allUsers).toHaveLength(3)
    expect(result).toEqual('success');
  })

  test("restore date values", async () => {
    const client = createPrismaClient(data);

    const original = await client.post.create({
      data: {
        title: 'Hello, world!',
      }
    });
    try {
      await client.$transaction(() => {
        throw 'rollback';
      });
    } catch {}

    const actual = await client.post.findFirst();
    expect(JSON.stringify(original)).toBe(JSON.stringify(actual));
  })
});
