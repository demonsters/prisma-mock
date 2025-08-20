
import createPrismaClient from "./createPrismaClient";

describe("PrismaMock update", () => {
  const data = {
    user: [
      { id: 1, name: 'Henk', clicks: 2, uniqueField: 'user 1' },
      { id: 2, name: 'Piet', clicks: 5, uniqueField: 'user 2' },
    ]
  }

  test("increment", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          increment: 10,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(12);
    expect(users[1].clicks).toEqual(15);
  });

  test("increment negative", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          increment: -1,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(1);
    expect(users[1].clicks).toEqual(4);
  });

  test("increment where", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          increment: 10,
        },
      },
      where: {
        id: 1
      }
    })
    const users = await client.user.findMany({
      orderBy: {
        id: "asc"
      }
    })
    expect(users[0].clicks).toEqual(12);
    expect(users[1].clicks).toEqual(5);
  });

  test("decrement", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          decrement: 1,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(1);
    expect(users[1].clicks).toEqual(4);
  });

  test("multiply", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          multiply: 2,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(4);
    expect(users[1].clicks).toEqual(10);
  });

  test("divide", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          divide: 2,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(1);
    expect(users[1].clicks).toEqual(2);
  })

  // TODO:
  test.skip("divide float", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          divide: 2,
        },
      },
    })
    const users = await client.user.findMany()
    expect(users[0].clicks).toEqual(1);
    expect(users[1].clicks).toEqual(2.5);
  });

  test("set", async () => {
    const client = await createPrismaClient(data);
    await client.user.updateMany({
      data: {
        clicks: {
          set: 2,
        },
      },
    });
    const users = await client.user.findMany();
    expect(users[0].clicks).toEqual(2);
    expect(users[1].clicks).toEqual(2);
  });

  test("undefined values are unchanged", async () => {
    const client = await createPrismaClient(data);
    await client.user.update({
      where: {
        id: 1,
      },
      data: {
        name: undefined,
      },
    });
    const user = await client.user.findUnique({ where: { id: 1 } });
    expect(user.name).toEqual("Henk");
    expect(user.clicks).toEqual(2);
  });

  test("Should return", async () => {
    const client = await createPrismaClient(data);
    const document = await client.document.create({
      data: {
        name: "123"
      }
    })
    const user = await client.user.update({
      where: {
        id: 1,
      },
      data: {
        name: undefined,
        // documents: {
        //   set: [{ id: document.id }],
        // },
        documents: { set: [] },
      },
    });
    expect(user).toMatchInlineSnapshot(`
Object {
  "accountId": null,
  "age": 10,
  "clicks": 2,
  "deleted": false,
  "id": 1,
  "name": "Henk",
  "role": "ADMIN",
  "sort": null,
  "uniqueField": "user 1",
}
`)
  });
});


test("Multi dimensional update", async () => {

  const client = await createPrismaClient({
    // user: [
    //   {
    //     id: 1,
    //     uniqueField: 'user 1',
    //   }
    // ],
    // answer: [
    //   {
    //     id: 1,
    //     title: "old title"
    //   }
    // ],
    // userAnswer: [
    //   {
    //     answerId: 1,
    //     userId: 1
    //   }
    // ],
  });
  await client.user.create({
    data: {
      id: 1,
      uniqueField: 'user 1',
    }
  })
  await client.answers.create({
    data: {
      id: 1,
      title: "old title"
    }
  })
  await client.userAnswers.create({
    data: {
      answerId: 1,
      userId: 1
    }
  })

  await client.user.update({
    where: {
      id: 1,
    },
    data: {
      answers: {
        update: {
          data: {
            answer: {
              update: {
                title: "new title",
              },
            }
          },
          where: {
            userId_answerId: {
              userId: 1,
              answerId: 1
            }
          }
        },
      }
    },
  });


  const user = await client.user.findUnique({
    where: {
      id: 1,
    },
    include: {
      answers: true,
    },
  })

  expect(user?.answers.length).toBe(1)

  const answer = await client.answers.findUnique({
    where: {
      id: 1
    }
  })
  expect(answer?.title).toBe("new title")

})
