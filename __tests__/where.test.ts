// @ts-nocheck

import createPrismaClient from '../src';
import { PrismaClient } from '@prisma/client';


// TODO:
// OR
// Pagination
// equals?: string | null
//   not?: string | StringFilter | null
//   in?: Enumerable<string> | null
//   notIn?: Enumerable<string> | null

// every?: PostWhereInput | null
// some?: PostWhereInput | null
// none?: PostWhereInput | null
// connect & create subitems
// OrderBy

describe('PrismaClient where', () => {
  const date1 = new Date(2020, 1, 1);
  const date2 = new Date(2020, 1, 2);

  const data = {
    user: [
      {
        id: 1,
        name: 'Henk',
        accountId: 1,
      },
      {
        id: 2,
        name: 'Dirk',
        accountId: 2,
      },
    ],
    account: [
      {
        id: 1,
        name: 'Piet',
        date: date1,
      },
      {
        id: 2,
        name: 'Dirk',
        date: date2,
      },
      {
        id: 3,
        name: 'Sjors',
        date: date2,
      },
    ],
  };

  test('multiple', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        date: { lte: date1 },
        name: 'Dirk'
      },
    });
    expect(account).not.toEqual([data.account[0]]);
  });

  test('startsWith', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        name: { startsWith: 'Di' },
      },
    });
    expect(account).toEqual([data.account[1]]);
  });

  test('endsWith', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        name: { endsWith: 'rk' },
      },
    });
    expect(account).toEqual([data.account[1]]);
  });

  test('contains', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        name: { contains: 'ir' },
      },
    });
    expect(account).toEqual([data.account[1]]);
  });

  test('equals', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        name: { equals: 'Dirk' },
      },
    });
    expect(account).toEqual([data.account[1]]);
  });

  test('gt', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        id: { gt: 1 },
      },
    });
    expect(account).toEqual([data.account[1], data.account[2]]);
  });

  test('gte', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        id: { gte: 1 },
      },
    });
    expect(account).toEqual(data.account);
  });

  test('lt', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        id: { lt: 2 },
      },
    });
    expect(account).toEqual([data.account[0]]);
  });

  test('lte', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        id: { lte: 2 },
      },
    });
    expect(account).toEqual([data.account[0], data.account[1]]);
  });

  test('in', async () => {
    const client = await createPrismaClient(data);
    const account = await client.account.findMany({
      where: {
        name: { in: ['Piet', 'Sjors'] },
      },
    });
    expect(account).toEqual([data.account[0], data.account[2]]);
  });

  test('Deep', async () => {
    const client = await createPrismaClient(data);
    const account = await client.user.findMany({
      where: {
        account: {
          name: 'Dirk',
        },
      },
    });
    expect(account.length).toEqual(1);
  });

  test('date', async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findMany({
      where: {
        date: new Date(date1.toDateString()),
      },
    });
    expect(accounts).toEqual([data.account[0]]);
  });

  test("OR", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findMany({
      where: {
        OR: [{ name: "Dirk" }, { name: "Piet" }],
      },
    })
    expect(accounts.length).toEqual(2);
    expect(accounts).toEqual([data.account[0], data.account[1]]);
  })

  test("NOT", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findMany({
      where: {
        NOT: [{ name: "Dirk" }, { name: "Piet" }],
      },
    })
    expect(accounts.length).toEqual(1);
    expect(accounts).toEqual([data.account[2]]);
  })

  test("AND", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findMany({
      where: {
        AND: [{ name: "Dirk" }, { id: 2 }],
      },
    })
    expect(accounts.length).toEqual(1);
    expect(accounts).toEqual([data.account[1]]);
  })

});
