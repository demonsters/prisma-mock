// @ts-nocheck

import createIndexes from "./indexes"


test("createIndexes", () => {
  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("User", {
    name: "id",
    isId: true
  })
  indexes.addIndexFieldIfNeeded("User", {
    name: "account",
    relationFromFields: ["accountId"]
  })

  indexes.updateItem("User", {
    id: 1,
    name: "Alice",
    accountId: 1
  })

  const items1 = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items1).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "id": 1,
    "name": "Alice",
  },
]
`)

  indexes.updateItem("User", {
    id: 1,
    name: "Alice 2",
    accountId: 1
  })

  const items2 = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items2).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "id": 1,
    "name": "Alice 2",
  },
]
`)

})

test("Index should be removed when set to null", () => {

  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("User", {
    name: "id",
    isId: true
  })
  indexes.addIndexFieldIfNeeded("User", {
    name: "account",
    relationFromFields: ["accountId"]
  })

  indexes.updateItem("User", {
    id: 1,
    name: "Alice",
    accountId: 1
  })

  indexes.updateItem("User", {
    id: 2,
    name: "Piet",
    accountId: 1
  })

  const items1 = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items1).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "id": 1,
    "name": "Alice",
  },
  {
    "accountId": 1,
    "id": 2,
    "name": "Piet",
  },
]
`)

  indexes.updateItem("User", {
    id: 1,
    name: "Alice",
    accountId: null
  }, {
    id: 1,
    name: "Alice",
    accountId: 1,
  })

  const items2 = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items2).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "id": 2,
    "name": "Piet",
  },
]
`)

})

test("Should add multiple items", () => {

  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("User", {
    name: "id",
    isId: true
  })
  indexes.addIndexFieldIfNeeded("User", {
    name: "account",
    relationFromFields: ["accountId"]
  })

  indexes.updateItem("User", {
    id: 1,
    name: "Alice",
    accountId: 1
  })

  indexes.updateItem("User", {
    id: 2,
    name: "Alice 2",
    accountId: 1
  })

  indexes.updateItem("User", {
    id: 3,
    name: "Alice 3",
    accountId: 1
  })

  const items = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "id": 1,
    "name": "Alice",
  },
  {
    "accountId": 1,
    "id": 2,
    "name": "Alice 2",
  },
  {
    "accountId": 1,
    "id": 3,
    "name": "Alice 3",
  },
]
`)

})

test("Should not make multiple items when has mulitple primary keys", () => {

  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("UserAnswers", {
    name: "answerId",
    isId: false
  }, true)

  indexes.addIndexFieldIfNeeded("UserAnswers", {
    name: "userId",
    isId: false
  }, true)

  indexes.updateItem("UserAnswers", {
    userId: 1,
    name: "Alice",
    accountId: 1
  })

  indexes.updateItem("UserAnswers", {
    userId: 1,
    name: "Alice 2",
    accountId: 1
  })

  const items = indexes.getIndexedItems("UserAnswers", {
    accountId: 1,
    userId: 1,
  })

  expect(items).toMatchInlineSnapshot(`
[
  {
    "accountId": 1,
    "name": "Alice 2",
    "userId": 1,
  },
]
`)

})