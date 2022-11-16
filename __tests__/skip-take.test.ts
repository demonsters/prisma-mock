// @ts-nocheck

import createPrismaClient from '../src';

const data = {
  user: [
    {
      id: 1,
      name: 'sadfsdf',
      accountId: 1,
    },
  ],
  account: [
    {
      id: 1,
      name: 'B',
    },
    {
      id: 2,
      name: 'A',
    },
  ],
};

for (let i = 0; i < 10; i++) {
  data.user.push({
    id: i + 2,
    name: `user ${i + 2}`,
    accountId: 2,
  });
}

test('findMany skip', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    skip: 9,
  });
  expect(users).toEqual(data.user.slice(9));
});

test('findMany take', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    take: 2,
  });
  expect(users).toEqual(data.user.slice(0, 2));
});

test('findMany skip/take', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    skip: 9,
    take: 1,
  });
  expect(users).toEqual(data.user.slice(9, 10));
});

test('findMany skip=0', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    skip: 0,
  });
  expect(users).toEqual(data.user);
});

test('findMany take=0', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    take: 0,
  });
  expect(users).toEqual([]);
});

test('findMany skip/take with where clause', async () => {
  const client = await createPrismaClient(data);
  const users = await client.user.findMany({
    where: {
      accountId: 2,
    },
    skip: 8,
    take: 2,
  });
  expect(users).toEqual(data.user.slice(9, 11));
});

test('findMany skip/take on relation', async () => {
  const client = await createPrismaClient(data);
  const users = await client.account.findUnique({
    where: {
      id: 2,
    },
    include: {
      users: {
        skip: 8,
        take: 2,
      },
    },
  });
  expect(users).toEqual({ ...data.account[1], users: data.user.slice(9, 11) });
});
