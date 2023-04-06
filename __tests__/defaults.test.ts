// @ts-nocheck

import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import createPrismaClient from "./createPrismaClient";
import { v4 } from "uuid"

describe("defaults", () => {
  test("autoincrement", async () => {
    const client = await createPrismaClient({});
    const user = await client.user.create({
      data: {
        name: "New user",
        uniqueField: "new",
      },
    });
    expect(user.id).toBe(1);
    await client.user.delete({
      where: {
        id: user.id,
      },
    });
    const user2 = await client.user.create({
      data: {
        name: "New user 2",
        uniqueField: "new2",
      },
    });
    expect(user2.id).toBe(2);
  });

  test("autoincoment: alternative id name", async () => {
    const client = await createPrismaClient({});
    const element = await client.element.create({
      data: {
        value: "New user",
        user: { create: { name: "New user", uniqueField: "new" } }
      },
    });
    expect(element.e_id).toBe(1);
    const element2 = await client.element.create({
      data: {
        value: "New user 2",
        user: { create: { name: "New user", uniqueField: "new2" } }
      },
    });
    expect(element2.e_id).toBe(2);
  });

  test("cuid", async () => {
    const client = await createPrismaClient({});
    const document = await client.document.create({
      data: {
        name: "New document",
      },
    });
    expect(document.id).not.toBeFalsy();
    expect(document.id).toHaveLength(25);
    const firstId = document.id;
    await client.document.delete({
      where: {
        id: document.id,
      },
    });
    const document2 = await client.document.create({
      data: {
        name: "New document 2",
      },
    });
    expect(document2.id).not.toBeFalsy();
    expect(document2.id).toHaveLength(25);
    expect(document2.id).not.toEqual(firstId);
  });

  test("uuid", async () => {
    const client = await createPrismaClient({
      transaction: [
        {
          id: v4(),
          initiator: 'initial data'
        }
      ]
    });
    const transaction = await client.transaction.create({
      data: {
        initiator: 'new data'
      },
    });

    expect(transaction.initiator).toEqual('new data')
    expect(transaction.id).toHaveLength(36)
  })
});
