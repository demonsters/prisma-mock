import type { Prisma } from "@prisma/client"
import { getCompoundIdKey, getCompoundKeys } from "./compoundKeys"

const createModel = (model: Partial<Prisma.DMMF.Model>) => ({
  name: "Model",
  fields: [],
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  ...model,
}) as Prisma.DMMF.Model

describe('getCompoundKeys', () => {
  test('should join the fields when there is no custom name', () => {
    const model = createModel({
      primaryKey: { name: null, fields: ["a", "b"] },
      uniqueFields: [["c", "d"]],
      uniqueIndexes: [{ name: null, fields: ["c", "d"] }],
    })
    expect(getCompoundKeys(model)).toEqual([
      { name: "a_b", fields: ["a", "b"] },
      { name: "c_d", fields: ["c", "d"] },
    ])
  })

  test('should use the custom name when there is one', () => {
    const model = createModel({
      primaryKey: { name: "customId", fields: ["a", "b"] },
      uniqueFields: [["c", "d"]],
      uniqueIndexes: [{ name: "customUnique", fields: ["c", "d"] }],
    })
    expect(getCompoundKeys(model)).toEqual([
      { name: "customId", fields: ["a", "b"] },
      { name: "customUnique", fields: ["c", "d"] },
    ])
  })

  test('should ignore single field constraints', () => {
    const model = createModel({
      primaryKey: { name: null, fields: ["a"] },
      uniqueFields: [["b"]],
      uniqueIndexes: [{ name: "single", fields: ["b"] }],
    })
    expect(getCompoundKeys(model)).toEqual([])
    expect(getCompoundIdKey(model)).toBeNull()
  })

  test('should fall back to uniqueFields when uniqueIndexes is missing', () => {
    const model = createModel({
      uniqueFields: [["a", "b"], ["c"]],
      uniqueIndexes: undefined,
    })
    expect(getCompoundKeys(model)).toEqual([
      { name: "a_b", fields: ["a", "b"] },
    ])
  })
})
