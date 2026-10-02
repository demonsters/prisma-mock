import type { Prisma } from "@prisma/client"

/**
 * Creates an indexing system for Prisma mock data to improve query performance.
 * This module maintains in-memory indexes on specified fields to enable fast lookups
 * instead of scanning all records.
 * 
 * @param isEnabled - Whether indexing is enabled. When false, all operations are no-ops.
 * @param caseInsensitive - Whether string filters compare case insensitively, which an exact
 *   lookup can't answer
 * @returns Object containing methods for managing indexes and performing indexed lookups
 */
export default function createIndexes(isEnabled: boolean = true, caseInsensitive: boolean = false) {

  // Main data structures for storing indexed data
  // items: tableName -> fieldName -> fieldValue -> the items with that value, keyed by getItemKey
  let items: Record<string, Record<string, Map<any, Map<any, any>>>> = {}

  // indexedFieldNames: tableName -> array of field names that are indexed
  let indexedFieldNames: Record<string, string[]> = {}

  // fields: tableName -> fieldName -> Prisma field metadata
  let fields: Record<string, Record<string, Prisma.DMMF.Field>> = {}

  // idFieldNames: tableName -> array of field names that serve as unique identifiers
  let idFieldNames: Record<string, string[]> = {}

  // rowCounts: tableName -> number of rows indexed. A lookup trusts the index, misses
  // included, only while this equals the table's length
  let rowCounts: Record<string, number> = {}

  // The order items were first indexed in, which is the order of the table: rows are
  // appended, keep their place when updated, and a rebuild indexes them in table order
  let positions = new WeakMap<object, number>()
  let nextPosition = 0

  /**
   * Adds a field to the indexing system if it meets the criteria for indexing.
   * Fields are indexed if they are:
   * - Primary key fields (isId or isPrimary)
   * - Unique fields
   * - Foreign key fields (relationFromFields)
   * 
   * @param tableName - Name of the table/model
   * @param field - Prisma field metadata
   * @param isPrimary - Whether this field is part of the primary key
   */
  const addIndexFieldIfNeeded = (tableName: string, field: Prisma.DMMF.Field, isPrimary: boolean) => {
    if (!isEnabled) {
      return
    }

    // Initialize data structures for this table if they don't exist
    if (!indexedFieldNames[tableName]) {
      indexedFieldNames[tableName] = []
    }
    if (!fields[tableName]) {
      fields[tableName] = {}
    }
    if (!idFieldNames[tableName]) {
      idFieldNames[tableName] = []
    }

    let thisFields = fields[tableName]
    let thisFieldNames = indexedFieldNames[tableName]
    let thisIdFieldNames = idFieldNames[tableName]

    // Index primary key, unique, and ID fields
    if (field.isId || field.isUnique || isPrimary) {
      if (!thisFieldNames.includes(field.name)) {
        thisFieldNames.push(field.name)
      }
    }

    // Track ID fields separately for item identification
    if (field.isId || isPrimary) {
      if (!thisIdFieldNames.includes(field.name)) {
        thisIdFieldNames.push(field.name)
      }
    }

    // Index foreign key fields (relationFromFields contains the foreign key field names)
    if (!!field.relationFromFields?.length) {
      const fieldName = field.relationFromFields[0]
      thisFieldNames.push(fieldName)
    }

    // Store field metadata for later use
    thisFields[field.name] = field
  }

  /**
   * The key an item is stored under in the entry of one of its field's values: its id
   * fields other than that field, so a later version of the same row replaces it without
   * scanning the entry. Items without such an id are told apart by identity.
   */
  const getItemKey = (tableName: string, fieldName: string, item: any) => {
    const keyFieldNames = (idFieldNames[tableName] || []).filter((f) => f !== fieldName)
    if (keyFieldNames.length === 0) return item
    if (keyFieldNames.length === 1) return item[keyFieldNames[0]]
    return JSON.stringify(keyFieldNames.map((f) => item[f]))
  }

  const removeFromEntry = (entries: Map<any, Map<any, any>>, value: any, key: any) => {
    const entry = entries.get(value)
    if (!entry) return
    entry.delete(key)
    // Without an entry, a lookup of the value falls back to scanning the table
    if (entry.size === 0) entries.delete(value)
  }

  // A Map finds these the way the matcher's `!==` compares them, apart from NaN
  const isIndexable = (value: any) =>
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    (typeof value === "number" && !Number.isNaN(value))

  // Strings compared case insensitively can match values the index holds in another case
  const isExact = (value: any, filter: any) =>
    typeof value !== "string" || !(caseInsensitive || filter?.mode === "insensitive")

  /**
   * The values a filter on a single field pins that field to, when an exact lookup of each
   * finds every row it can match: a plain value, `equals` or `in`. Other operators next to
   * them only narrow the rows down further, which the matcher does afterwards.
   */
  const getLookupValues = (filter: any): any[] | null => {
    if (isIndexable(filter)) {
      return [filter]
    }
    if (!filter || typeof filter !== "object" || filter instanceof Date || Array.isArray(filter)) {
      return null
    }
    if ("equals" in filter) {
      return isIndexable(filter.equals) && isExact(filter.equals, filter) ? [filter.equals] : null
    }
    if (Array.isArray(filter.in) && filter.in.every((value) => isIndexable(value) && isExact(value, filter))) {
      return filter.in
    }
    return null
  }

  // The items indexed under any of the values, in table order
  const getItems = (tableName: string, fieldName: string, values: any[]) => {
    const entries = items[tableName]?.[fieldName]
    const found = []
    for (const value of new Set(values)) {
      const entry = entries?.get(value)
      if (entry) {
        found.push(...entry.values())
      }
    }
    return found.sort((a, b) => positions.get(a) - positions.get(b))
  }

  const rebuildTable = (tableName: string, rows: any[]) => {
    items[tableName] = {}
    rowCounts[tableName] = 0
    for (const row of rows) {
      updateItem(tableName, row, null)
    }
  }

  /**
   * Performs an indexed lookup based on the where clause.
   * Recursively handles AND conditions and returns the first matching indexed result.
   * When the table's rows are passed and their number differs from what was indexed (rows
   * pushed straight into the internal state), the table is indexed again first.
   *
   * @param tableName - Name of the table to search
   * @param where - Prisma where clause object
   * @param rows - The rows of the table, to check the index still covers all of them
   * @returns Array of the items the where clause can match (empty when none can), or null
   *   if no indexed lookup is possible
   */
  const getIndexedItems = (tableName: string, where: any, rows?: any[]) => {
    if (!isEnabled || !indexedFieldNames[tableName]) {
      return null
    }
    if (rows && rowCounts[tableName] !== rows.length) {
      rebuildTable(tableName, rows)
    }

    for (const field in where) {
      // Handle AND conditions recursively
      if (field === "AND") {
        const subWhere = where.AND
        if (Array.isArray(subWhere)) {
          for (const subWhereItem of subWhere) {
            const found = getIndexedItems(tableName, subWhereItem)
            if (found) {
              return found
            }
          }
        }
        continue
      }

      if (indexedFieldNames[tableName].includes(field)) {
        const values = getLookupValues(where[field])
        if (values) {
          return getItems(tableName, field, values)
        }
      }
    }

    return null
  }

  /**
   * Updates the index when an item is created, updated, or deleted.
   * Handles both adding new items and updating existing ones.
   * 
   * @param tableName - Name of the table
   * @param item - The new/updated item
   * @param oldItem - The previous version of the item (null for new items)
   */
  const updateItem = (tableName: string, item: any, oldItem: any | null) => {
    if (!isEnabled) {
      return
    }

    // Initialize table structures if needed
    if (!items[tableName]) {
      items[tableName] = {}
    }
    if (!indexedFieldNames[tableName]) {
      throw new Error(`No indexed fields for table ${tableName}`)
    }

    // A new row counts towards the table. An update keeps the row's place in it, taken from
    // the earlier version, or from the one found under the same key while indexing below
    let position = oldItem ? positions.get(oldItem) : undefined
    if (!oldItem) {
      rowCounts[tableName] = (rowCounts[tableName] || 0) + 1
    }

    // Update each indexed field
    for (const fieldName of indexedFieldNames[tableName]) {
      if (!items[tableName][fieldName]) {
        items[tableName][fieldName] = new Map()
      }

      const entries = items[tableName][fieldName]
      const key = getItemKey(tableName, fieldName, item)

      // The earlier version of an updated item leaves the entry it was indexed under when its
      // value or id changed, so it isn't found under a value it no longer holds. Otherwise it
      // is replaced in place below, keeping its position
      if (oldItem && oldItem[fieldName] != null) {
        const oldKey = getItemKey(tableName, fieldName, oldItem)
        if (oldItem[fieldName] !== item[fieldName] || oldKey !== key) {
          removeFromEntry(entries, oldItem[fieldName], oldKey)
        }
      }

      // Items without a value for the field aren't indexed under it. A where on null also
      // matches rows where the field is missing, so those lookups scan the table
      if (item[fieldName] == null) {
        continue
      }

      const field = fields[tableName][fieldName]
      const isUnique = field && (field.isId || field.isUnique)
      const entry = entries.get(item[fieldName])
      const earlier = entry && (isUnique ? entry.values().next().value : entry.get(key))
      if (earlier !== undefined) {
        position ??= positions.get(earlier)
      }
      if (!entry || isUnique) {
        // A new value, or a unique one, which this item alone holds
        entries.set(item[fieldName], new Map([[key, item]]))
      } else {
        // For non-unique fields, replace the earlier version of this item or add it
        entry.set(key, item)
      }
    }

    // Rows that are new, or whose earlier version wasn't indexed, go last
    positions.set(item, position ?? nextPosition++)
  }

  /**
   * Removes an item from the index when it's deleted.
   *
   * @param tableName - Name of the table
   * @param item - The item being deleted
   */
  const deleteItem = (tableName: string, item: any) => {
    if (!isEnabled || !indexedFieldNames[tableName]) {
      return
    }

    // Remove this item, and only this item, from the entry of each of its values
    for (const fieldName of indexedFieldNames[tableName]) {
      const entries = items[tableName]?.[fieldName]
      if (entries && item[fieldName] != null) {
        removeFromEntry(entries, item[fieldName], getItemKey(tableName, fieldName, item))
      }
    }
    rowCounts[tableName] = (rowCounts[tableName] || 0) - 1
  }

  /**
   * Indexes every table again, for when the data is replaced as a whole and the items
   * indexed so far no longer describe it.
   *
   * @param data - The new data, by table name
   */
  const rebuild = (data: Record<string, any[]>) => {
    if (!isEnabled) {
      return
    }
    items = {}
    rowCounts = {}
    for (const tableName in indexedFieldNames) {
      rebuildTable(tableName, data[tableName] || [])
    }
  }

  return {
    addIndexFieldIfNeeded,
    getIndexedItems,
    updateItem,
    deleteItem,
    rebuild,
  }

}