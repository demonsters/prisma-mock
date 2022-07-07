// @ts-nocheck

import createPrismaClient from "../src";


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
      name: "B",
    },
    {
      id: 2,
      name: "A",
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


test("orderBy", async () => {
  const client = await createPrismaClient(data);
  const accounts = await client.account.findMany({
    orderBy: {
      name: "asc",
    }
  });
  expect(accounts).toEqual([
    expect.objectContaining({
      id: 2,
      name: "A",
    }),
    expect.objectContaining({
      id: 1,
      name: "B",
    }),
  ]);
});

