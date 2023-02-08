// @ts-nocheck

import createPrismaClient from "./createPrismaClient";
import { PrismaClient } from "@prisma/client";


describe("PrismaClient include", () => {
  const data = {
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
    user: [
      {
        id: 1,
        name: "sadfsdf",
        accountId: 1,
        uniqueField: "user1",
      },
    ],
    stripe: [
      {
        id: 1,
        accountId: 1,
        customerId: "sadfsdf",
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
      clicks: null,
      account: {
        ...data.account[0],
        sort: null
      },
      deleted: false,
      role: "ADMIN",
      sort: null,
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
      active: false,
      sort: null,
      account: {
        ...data.account[0],
        sort: null
      },
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
    expect(user).toMatchInlineSnapshot(`
Object {
  "account": Object {
    "id": 1,
    "name": "sadfsdf",
    "sort": null,
    "stripe": Object {
      "accountId": 1,
      "active": false,
      "customerId": "sadfsdf",
      "id": 1,
      "sort": null,
    },
  },
  "accountId": 1,
  "clicks": null,
  "deleted": false,
  "id": 1,
  "name": "sadfsdf",
  "role": "ADMIN",
  "sort": null,
  "uniqueField": "user1",
}
`)
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
    expect(users[0]).toMatchInlineSnapshot(`
Object {
  "account": Object {
    "id": 1,
    "name": "sadfsdf",
    "sort": null,
    "stripe": Object {
      "accountId": 1,
      "active": false,
      "customerId": "sadfsdf",
      "id": 1,
      "sort": null,
    },
  },
  "accountId": 1,
  "clicks": null,
  "deleted": false,
  "id": 1,
  "name": "sadfsdf",
  "role": "ADMIN",
  "sort": null,
  "uniqueField": "user1",
}
`)
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
    expect(users[0]).toMatchInlineSnapshot(`
Object {
  "id": 1,
  "name": "sadfsdf",
  "sort": null,
  "users": Array [
    Object {
      "accountId": 1,
      "clicks": null,
      "deleted": false,
      "id": 1,
      "name": "sadfsdf",
      "role": "ADMIN",
      "sort": null,
      "uniqueField": "user1",
    },
  ],
}
`)
  });
});
