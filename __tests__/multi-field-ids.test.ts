// @ts-nocheck

import createPrismaClient from "../src";

describe("PrismaClient @@id()", () => {
  const data = {
    user: [
      {
        id: 1,
        name: "sadfsdf",
      },
    ],
    userAnswers: [
      {
        userId: 1,
        answerId: 2,
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
    element: [
      {
        id: 1,
        value: "Element",
        userId: 1,
      },
      {
        id: 2,
        value: "Element",
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
    expect(user).toEqual(expect.objectContaining(data.userAnswers[0]));
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

    await client.userAnswers.create({
      data: {
        userId_answerId: {
          userId: 1,
          answerId: 3,
        },
      },
    });

    await client.userAnswers.updateMany({
      data: {
        answerId: 2,
      },
    });

    const items = await client.userAnswers.findMany();
    expect(items.length).toEqual(2);
    expect(items[0].answerId).toEqual(2);
    expect(items[1].answerId).toEqual(2);
  });

  test("connect multiple records at creation", async () => {
    const client = await createPrismaClient(data);

    const user = await client.user.create({
      data: {
        element: {
          connect: [{ id: 1 }, { id: 2 }],
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
