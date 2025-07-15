// @ts-nocheck

import createPrismaClient from "./createPrismaClient";

describe("PrismaClient @@id()", () => {
  const data = {
    user: [
      {
        name: "sadfsdf",
        uniqueField: "user1",
      },
    ],
    answers: [
      {
        id: 1,
        title: "Answer",
      },
      {
        id: 2,
        title: "Answer",
      },
      {
        id: 3,
        title: "Answer",
      },
    ],
    userAnswers: [
      {
        userId: 1,
        answerId: 2,
      },
    ],
    element: [
      {
        e_id: 1,
        value: "Element1",
        userId: 1,
      },
      {
        e_id: 2,
        value: "Element2",
        userId: 1,
      },
    ],
  };

  test("findOne", async () => {
    const client = await createPrismaClient(data);
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 2,
        },
      },
    });
    expect(user).toMatchInlineSnapshot(`
{
  "answerId": 2,
  "userId": 1,
  "value": null,
}
`)
  });

  test("findOne NOT found", async () => {
    const client = await createPrismaClient(data);
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 2,
          answerId: 2,
        },
      },
    });
    expect(user).toBe(null);
  });

  test("create", async () => {
    const client = await createPrismaClient(data);
    await client.userAnswers.create({
      data: {
        user: { connect: { id: 1 } },
        answer: { connect: { id: 1 } },
      },
    });
    const user = await client.userAnswers.findUnique({
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 1,
        },
      },
    });
    expect(user.userId_answerId).toBeFalsy();
  });

  test("delete", async () => {});

  test("update", async () => {});

  test("upsert insert", async () => {
    const client = await createPrismaClient(data);

    const newItem1 = await client.userAnswers.upsert({
      create: {
        value: "created",
        answer: { connect: { id: 1 } },
        user: { connect: { id: 1 } },
      },
      update: {
        value: "updated",
      },
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 1,
        },
      },
    });
    expect(newItem1.answerId).toEqual(1);
    expect(newItem1.value).toEqual("created");

    const newItem3 = await client.userAnswers.upsert({
      create: {
        value: "created",
        answer: { connect: { id: 3 } },
        user: { connect: { id: 1 } },
      },
      update: {
        value: "updated",
      },
      where: {
        userId_answerId: {
          userId: 1,
          answerId: 3,
        },
      },
    });
    expect(newItem3.value).toEqual("created");

    // const userAnswers = await client.userAnswers.findMany({}) //?
    // expect(userAnswers.length).toEqual(2)
    //

    // const found = await client.userAnswers.findUnique({
    //   where: {
    //     userId_answerId: {
    //       userId: 1,
    //       answerId: 1
    //     },
    //   },
    // })
    // expect(found.userId).toEqual(1)
  });

  test("upsert update", async () => {});

  test("updateMany", async () => {
    const client = await createPrismaClient(data);

    await client.userAnswers.updateMany({
      data: {
        answerId: 3,
      },
    });

    const items = await client.userAnswers.findMany();
    expect(items).toMatchInlineSnapshot(`
[
  {
    "answerId": 3,
    "userId": 1,
    "value": null,
  },
]
`)
  });

  test("connect multiple records at creation", async () => {
    const client = await createPrismaClient(data);

    const user = await client.user.create({
      data: {
        uniqueField: "user2",
        element: {
          connect: [{ e_id: 1 }, { e_id: 2 }],
        },
      },
    });

    const elements = await client.element.findMany({
      where: {
        userId: user.id,
      },
    });
    expect(elements.length).toEqual(2);
    expect(elements[0].userId).toBe(user.id);
    expect(elements[1].userId).toBe(user.id);
  });

  test.todo("connect");
  test.todo("should throw when there is a duplicate");
});
