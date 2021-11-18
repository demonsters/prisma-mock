// @ts-nocheck

import createPrismaClient from "../";
import { PrismaClient } from "@prisma/client";


describe("PrismaClient include", () => {
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
      include: {
        account: true,
      },
    });
    expect(user).toEqual({
      ...data.user[0],
      account: data.account[0],
    });
  });

  test("findOne from", async () => {
    const client = await createPrismaClient(data);
    const stripe = await client.stripe.findUnique({
      where: {
        id: 1,
      },
      include: {
        account: true,
      },
    });
    expect(stripe).toEqual({
      ...data.stripe[0],
      account: data.account[0],
    });
  });

  test("findOne deep", async () => {
    const client = await createPrismaClient(data);
    const user = await client.user.findUnique({
      where: {
        id: 1,
      },
      include: {
        account: {
          include: {
            stripe: true,
          },
        },
      },
    });
    expect(user).toEqual({
      ...data.user[0],
      account: {
        ...data.account[0],
        stripe: data.stripe[0],
      },
    });
  });

  test("findMany deep", async () => {
    const client = await createPrismaClient(data);
    const users = await client.user.findMany({
      where: {
        id: 1,
      },
      include: {
        account: {
          include: {
            stripe: true,
          },
        },
      },
    });
    expect(users[0]).toEqual({
      ...data.user[0],
      account: {
        ...data.account[0],
        stripe: data.stripe[0],
      },
    });
  });

  test("findMany one to many", async () => {
    const client = await createPrismaClient(data);
    const users = await client.account.findMany({
      where: {
        id: 1,
      },
      include: {
        users: true
      },
    });
    expect(users[0]).toEqual({
      ...data.account[0],
      users: [
        data.user[0],
      ],
    });
  });
});
