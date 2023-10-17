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
    name: "Alice",
    accountId: null
  })

  const items2 = indexes.getIndexedItems("User", {
    accountId: 1
  })

  expect(items2).toMatchInlineSnapshot(`undefined`)

})
