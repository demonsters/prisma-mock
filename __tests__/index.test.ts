// @ts-nocheck

import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import createPrismaClient from "../src/";

describe("PrismaClient", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "sadfsdf",
        accountId: 1,
        role: "ADMIN",
        uniqueField: "first",
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
  };

  test("findOne", async () => {
    const client = await createPrismaClient(data);
    const user = await client.user.findUnique({
      where: {
        id: 1,
      },
    });
    expect(user).toBe(data.user[0]);
  });

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

  test("findOne by id", async () => {
    const client = await createPrismaClient(data);
    const user = await client.account.findUnique({
      where: {
        id: 2,
      },
    });
    expect(user).toBe(data.account[1]);
  });

  test("findMany", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findMany();
    expect(accounts).toEqual(data.account);
  });

  test("findFirst", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.findFirst();
    expect(accounts).toEqual(data.account[0]);
  });

  test("count", async () => {
    const client = await createPrismaClient(data);
    const accounts = await client.account.count();
    expect(accounts).toEqual(2);
  });

  test("create", async () => {
    const client = await createPrismaClient(data);
    // TODO: Check output
    await client.user.create({
      data: {
        name: "New user",
        sort: 1,
        uniqueField: "new",
      },
    });
    const users = await client.user.findMany();

    expect(users).toEqual([
      ...data.user,
      {
        id: 2,
        name: "New user",
        role: "ADMIN",
        deleted: false,
        clicks: null,
        sort: 1,
        accountId: null,
        uniqueField: "new",
      },
    ]);
  });

  test("create connect", async () => {
    const client = await createPrismaClient(data);
    // TODO: Check output
    await client.user.create({
      data: {
        name: "New user",
        uniqueField: "new",
        sort: 1,
        account: { connect: { id: 1 } },
      },
    });
    const users = await client.user.findMany();

    expect(users).toEqual([
      ...data.user,
      {
        id: 2,
        name: "New user",
        role: "ADMIN",
        deleted: false,
        accountId: 1,
        clicks: null,
        sort: 1,
        uniqueField: "new",
      },
    ]);
  });

  test("delete", async () => {
    const client = await createPrismaClient(data);
    const user = await client.account.delete({
      where: {
        id: 2,
      },
    });
    const users = await client.account.findMany();
    expect(users).toEqual([data.account[0]]);
  });

  test("update", async () => {
    const client = await createPrismaClient(data);
    const user = await client.account.update({
      where: {
        id: 2,
      },
      data: {
        name: "New name",
      },
    });
    const users = await client.account.findMany();
    expect(users).toEqual([
      data.account[0],
      {
        id: 2,
        name: "New name",
      },
    ]);
  });

  test("upsert update", async () => {
    const client = await createPrismaClient(data);
    const user = await client.account.upsert({
      where: {
        id: 2,
      },
      update: {
        name: "New name",
      },
    });
    const users = await client.account.findMany();
    expect(users).toEqual([
      data.account[0],
      {
        id: 2,
        name: "New name",
      },
    ]);
  });

  test("upsert insert", async () => {
    const client = await createPrismaClient(data);
    const user = await client.account.upsert({
      where: {
        id: 3,
      },
      create: {
        id: 3,
        name: "New name",
        sort: 1,
      },
    });
    const users = await client.account.findMany();
    expect(users).toEqual([
      ...data.account,
      {
        id: 3,
        name: "New name",
        sort: 1,
      },
    ]);
  });

  test("connect implicit", async () => {
    const client = await createPrismaClient({});
    const account = await client.account.create({
      data: {
        id: 1,
        name: "New account",
      },
    });
    const user = await client.user.create({
      data: {
        name: "New user",
        guestOf: { connect: { id: 1 } },
      },
    });
    const users = await client.user.findMany({
      include: {
        guestOf: true,
      },
    });

    expect(users).toEqual([
      {
        ...user,
        guestOf: [account],
      },
    ]);
  });

  test("connect on secondary key", async () => {
    const client = await createPrismaClient(data);
    const element = await client.element.create({
      data: {
        value: "test element",
        user: {
          connect: { uniqueField: "first" },
        },
      },
    });
    const elements = await client.element.findMany({});

    expect(elements).toEqual([
      {
        e_id: 1,
        userId: 1,
        value: "test element",
      },
    ]);
  });

  test("connect on secondary key with invalid value", async () => {
    const client = await createPrismaClient(data);

    await expect(
      client.element.create({
        data: {
          value: "test element",
          user: {
            connect: { uniqueField: "second" },
          },
        },
      })
    ).rejects.toThrow(
      new PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found. {cause}",
        "P2025",
        "1.2.3"
      )
    );
  });
});
