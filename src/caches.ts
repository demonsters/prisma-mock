import type { Prisma } from "@prisma/client"
import { getCompoundKeys } from "./utils/compoundKeys"
import { getCamelCase, removeMultiFieldIds } from "./utils/fieldHelpers"
import { getLookupValues } from "./utils/lookupValues"

const addRow = (rowsByValue: Map<any, Set<any>>, value: any, row: any) => {
  const rows = rowsByValue.get(value)
  if (rows) {
    rows.add(row)
  } else {
    rowsByValue.set(value, new Set([row]))
  }
}

const removeRow = (rowsByValue: Map<any, Set<any>>, value: any, row: any) => {
  const rows = rowsByValue.get(value)
  if (!rows) return
  rows.delete(row)
  if (rows.size === 0) rowsByValue.delete(value)
}

// One string per combination of values, or undefined when a value has no exact JSON
// form, which then never equals the value of the row being created
export const getCompoundValue = (row: any, fields: readonly string[]) => {
  const values = fields.map((field) => row[field])
  const encodable = values.every((value) =>
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
  return encodable ? JSON.stringify(values) : undefined
}

/**
 * Creates the caches of one table: what is known about each version of its rows array, and
 * the lookups that use it. Writes replace a table's rows array rather than change it, so
 * everything cached per array is either carried forward to the array a write produces, or
 * rebuilt on demand.
 */
export const createCaches = <P extends typeof Prisma>({ ref, prop, datamodel, caseInsensitive }: {
  ref: any, // Reference to the mock data store
  prop: string, // The table's name in camelCase
  datamodel: P["dmmf"]["datamodel"], // Prisma datamodel definition
  caseInsensitive: boolean, // Whether string comparisons should be case insensitive
}) => {
  // The rows holding each value of a unique field and compound key, per version of a
  // table. Writes replace a table's rows array rather than change it, and create, update
  // and delete carry these forward to the array they produce, so checking for a duplicate
  // or finding the row a unique where points at is a lookup instead of a scan. Rows rather
  // than positions, so a delete doesn't shift what every later row is filed under.
  const valueRows = new WeakMap<any[], {
    length: number
    byKey: Map<string, { rows: Map<any, Set<any>>, getValue: (row: any) => any }>
  }>()

  // Versions of a table known to hold no compound key as a field, with their length.
  // removeMultiFieldIds checks every row, while after a write to such a version only the
  // rows it wrote can hold one
  const cleanRows = new WeakMap<any[], number>()

  const getTableModel = () => datamodel.models.find((model) => getCamelCase(model.name) === prop)

  const holdsCompoundKey = (row: any) =>
    getCompoundKeys(getTableModel()).some(({ name }) => name in row)

  /**
   * Moves the rows by value of the version a write started from to the version it produced,
   * when the write only took the `removed` rows out and put the `added` ones in
   */
  const carryValueRows = (from: any[], to: any[], removed: any[], added: any[]) => {
    const cached = valueRows.get(from)
    if (!cached || cached.length !== from.length) return
    for (const entry of cached.byKey.values()) {
      for (const row of removed) {
        removeRow(entry.rows, entry.getValue(row), row)
      }
      for (const row of added) {
        addRow(entry.rows, entry.getValue(row), row)
      }
    }
    cached.length = to.length
    // The previous version can't answer with these changes in it
    valueRows.delete(from)
    valueRows.set(to, cached)
  }

  /**
   * Carries over that a version holds no compound key fields, to a version a write produced
   * by only taking rows out of it, or adding ones that hold none
   */
  const carryCleanRows = (from: any[], to: any[]) => {
    if (cleanRows.get(from) === from.length) {
      cleanRows.set(to, to.length)
    }
  }

  /**
   * The rows holding each value of a unique field or compound key in this table, built
   * once per version of the rows.
   */
  const getValueRows = (key: string, getValue: (row: any) => any) => {
    const rows = ref.data[prop] || []
    let cached = valueRows.get(rows)
    // The length catches rows pushed straight into the internal state
    if (!cached || cached.length !== rows.length) {
      cached = { length: rows.length, byKey: new Map() }
      valueRows.set(rows, cached)
    }
    let entry = cached.byKey.get(key)
    if (!entry) {
      const rowsByValue = new Map()
      for (const row of rows) {
        addRow(rowsByValue, getValue(row), row)
      }
      entry = { rows: rowsByValue, getValue }
      cached.byKey.set(key, entry)
    }
    return entry.rows
  }

  const getFieldRows = (field: string) =>
    getValueRows(`field:${field}`, (row) => row[field])

  const getCompoundRows = (name: string, fields: readonly string[]) =>
    getValueRows(`compound:${name}`, (row) => getCompoundValue(row, fields))

  // The fields rows can be looked up by: ids, unique fields and foreign keys
  let lookupFieldNames: Set<string> | null = null
  const getLookupFieldNames = () => {
    if (!lookupFieldNames) {
      const tableModel = getTableModel()
      lookupFieldNames = new Set([
        ...tableModel.fields.filter((field) => field.isId || field.isUnique).map((field) => field.name),
        ...tableModel.fields.flatMap((field) => field.relationFromFields || []),
      ])
    }
    return lookupFieldNames
  }

  /**
   * The only rows a where clause can match, when it pins an id, unique or foreign key field
   * to values (plainly, with equals or with in) or a compound key to one; null when it
   * doesn't, and every row has to be matched. Top level keys and AND are combined with AND,
   * so a matching row always holds one of those values.
   */
  const getCandidateRows = (where: any): Iterable<any> | null => {
    if (!where) return null
    const tableModel = getTableModel()
    for (const key in where) {
      const value = where[key]
      if (key === "AND") {
        for (const subWhere of Array.isArray(value) ? value : [value]) {
          const rows = getCandidateRows(subWhere)
          if (rows) return rows
        }
        continue
      }
      const values = getLookupFieldNames().has(key) ? getLookupValues(value, caseInsensitive) : null
      if (values) {
        const rowsByValue = getFieldRows(key)
        if (values.length === 1) {
          return rowsByValue.get(values[0]) || []
        }
        const rows = new Set()
        for (const value of values) {
          for (const row of rowsByValue.get(value) || []) {
            rows.add(row)
          }
        }
        return rows
      }
      const compoundKey = getCompoundKeys(tableModel).find((compoundKey) => compoundKey.name === key)
      if (compoundKey && value && typeof value === "object") {
        const compoundValue = getCompoundValue(value, compoundKey.fields)
        if (compoundValue !== undefined) {
          return getCompoundRows(compoundKey.name, compoundKey.fields).get(compoundValue) || []
        }
      }
    }
    return null
  }

  /**
   * The positions of candidate rows in the table, in table order. A few are found by
   * reference; for many, one pass over the table is cheaper than looking each one up.
   */
  const getCandidateIndexes = (rows: any[], candidates: Iterable<any>) => {
    const list = [...candidates]
    if (list.length <= 16) {
      return list
        .map((row) => rows.indexOf(row))
        .filter((index) => index !== -1)
        .sort((a, b) => a - b)
    }
    const wanted = new Set(list)
    const found = []
    rows.forEach((row, index) => {
      if (wanted.has(row)) found.push(index)
    })
    return found
  }

  /**
   * removeMultiFieldIds after a write that produced the current rows from `previousRows`,
   * changing only the `written` rows. When the previous version was clean and none of the
   * written rows hold a compound key as a field, there is nothing to remove.
   */
  const removeCompoundKeyFields = (previousRows: any[], written: any[]) => {
    if (cleanRows.get(previousRows) !== previousRows.length || written.some(holdsCompoundKey)) {
      ref.data = removeMultiFieldIds(getTableModel(), ref.data)
    }
    cleanRows.set(ref.data[prop], ref.data[prop].length)
  }

  // The rows array a running createMany published as this table's version, which create
  // appends to in place instead of copying the table for every row. Once the createMany
  // returns, it is a version like any other, which nothing changes again
  let batchRows: any[] | null = null

  /**
   * Starts a createMany: one copy of the table for the whole batch, published as its next
   * version, which the creates append to in place. The creates run synchronously, so nothing
   * outside the createMany sees the array before it's complete. Returns what ends the batch.
   */
  const startBatch = () => {
    const outerBatchRows = batchRows
    const previousRows = ref.data[prop] || []
    batchRows = [...previousRows]
    ref.data = {
      ...ref.data,
      [prop]: batchRows,
    }
    carryValueRows(previousRows, batchRows, [], [])
    carryCleanRows(previousRows, batchRows)
    return () => {
      batchRows = outerBatchRows
    }
  }

  // Whether the rows are the version a running createMany appends to in place
  const isBatchRows = (rows: any[]) => batchRows !== null && rows === batchRows

  /**
   * Appends a row to the rows a running createMany owns, in place, and brings what is
   * known about that array up to date instead of starting over: its rows by value, and
   * whether it holds compound key fields.
   */
  const appendBatchRow = (row: any) => {
    const rows = batchRows
    const cached = valueRows.get(rows)
    const rowsByValueKnown = cached?.length === rows.length
    const clean = cleanRows.get(rows) === rows.length
    rows.push(row)
    // A new data object all the same, so what is cached for the data as a whole, like the
    // related rows a matcher collected, sees the write
    ref.data = { ...ref.data }
    if (clean && !holdsCompoundKey(row)) {
      cleanRows.set(rows, rows.length)
    } else {
      // When this rebuilds the table, the rest of the batch copies it again as create did
      ref.data = removeMultiFieldIds(getTableModel(), ref.data)
      cleanRows.set(ref.data[prop], ref.data[prop].length)
    }
    if (rowsByValueKnown && ref.data[prop] === rows) {
      for (const entry of cached.byKey.values()) {
        addRow(entry.rows, entry.getValue(row), row)
      }
      cached.length = rows.length
    }
    return ref.data[prop]
  }

  return {
    getFieldRows,
    getCompoundRows,
    getCandidateRows,
    getCandidateIndexes,
    carryValueRows,
    carryCleanRows,
    removeCompoundKeyFields,
    startBatch,
    isBatchRows,
    appendBatchRow,
  }
}
