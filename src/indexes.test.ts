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
Array [
  Object {
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
Array [
  Object {
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
Array [
  Object {
    "accountId": 1,
    "id": 1,
    "name": "Alice",
  },
  Object {
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
Array [
  Object {
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
Array [
  Object {
    "accountId": 1,
    "id": 1,
    "name": "Alice",
  },
  Object {
    "accountId": 1,
    "id": 2,
    "name": "Alice 2",
  },
  Object {
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
Array [
  Object {
    "accountId": 1,
    "name": "Alice 2",
    "userId": 1,
  },
]
`)

})
test("Updating one of many items that share a value only replaces that item", () => {
  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("User", { name: "id", isId: true })
  indexes.addIndexFieldIfNeeded("User", { name: "account", relationFromFields: ["accountId"] })

  for (const id of [1, 2, 3]) {
    indexes.updateItem("User", { id, name: `user ${id}`, accountId: 1 })
  }
  indexes.updateItem("User", { id: 2, name: "renamed", accountId: 1 }, { id: 2, name: "user 2", accountId: 1 })

  expect(indexes.getIndexedItems("User", { accountId: 1 }).map((item) => item.name)).toEqual(["user 1", "renamed", "user 3"])
})

test("Items sharing part of a compound id are told apart by all of it", () => {
  const indexes = createIndexes()

  indexes.addIndexFieldIfNeeded("Membership", { name: "organizationId" }, true)
  indexes.addIndexFieldIfNeeded("Membership", { name: "userId" }, true)
  indexes.addIndexFieldIfNeeded("Membership", { name: "team", relationFromFields: ["teamId"] })

  indexes.updateItem("Membership", { organizationId: 1, userId: 1, teamId: 1, role: "a" })
  indexes.updateItem("Membership", { organizationId: 1, userId: 2, teamId: 1, role: "b" })
  indexes.updateItem("Membership", { organizationId: 2, userId: 1, teamId: 1, role: "c" })
  indexes.updateItem("Membership", { organizationId: 1, userId: 2, teamId: 1, role: "renamed" })

  expect(indexes.getIndexedItems("Membership", { teamId: 1 }).map((item) => item.role)).toEqual(["a", "renamed", "c"])
})
