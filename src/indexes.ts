import type { Prisma } from "@prisma/client"

/**
 * Creates an indexing system for Prisma mock data to improve query performance.
 * This module maintains in-memory indexes on specified fields to enable fast lookups
 * instead of scanning all records.
 * 
 * @param isEnabled - Whether indexing is enabled. When false, all operations are no-ops.
 * @returns Object containing methods for managing indexes and performing indexed lookups
 */
export default function createIndexes(isEnabled: boolean = true) {

  // Main data structures for storing indexed data
  // items: tableName -> fieldName -> fieldValue -> the items with that value, keyed by getItemKey
  let items: Record<string, Record<string, Map<any, Map<any, any>>>> = {}

  // indexedFieldNames: tableName -> array of field names that are indexed
  let indexedFieldNames: Record<string, string[]> = {}

  // fields: tableName -> fieldName -> Prisma field metadata
  let fields: Record<string, Record<string, Prisma.DMMF.Field>> = {}

  // idFieldNames: tableName -> array of field names that serve as unique identifiers
  let idFieldNames: Record<string, string[]> = {}

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

  const getEntryItems = (tableName: string, fieldName: string, value: any) => {
    const entry = items[tableName]?.[fieldName]?.get(value)
    return entry && [...entry.values()]
  }

  /**
   * Performs an indexed lookup based on the where clause.
   * Recursively handles AND conditions and returns the first matching indexed result.
   * 
   * @param tableName - Name of the table to search
   * @param where - Prisma where clause object
   * @returns Array of matching items or null if no indexed lookup is possible
   */
  const getIndexedItems = (tableName: string, where: any) => {
    if (!isEnabled) {
      return null
    }

    for (const field in where) {
      // Handle AND conditions recursively
      if (field === "AND") {
        const subWhere = where.AND
        if (Array.isArray(subWhere)) {
          for (const subWhereItem of subWhere) {
            const items = getIndexedItems(tableName, subWhereItem)
            if (items) {
              return items
            }
          }
        }
      }

      // Check if this field is indexed
      if (indexedFieldNames[tableName]) {
        // Handle object-based conditions (e.g., { equals: value }, { in: [values] })
        if (typeof where[field] === "object") {
          for (const key in where[field]) {
            if (indexedFieldNames[tableName].includes(key)) {
              return getEntryItems(tableName, field, where[field][key])
            }
          }
        } else {
          // Handle direct value conditions
          if (indexedFieldNames[tableName].includes(field)) {
            return getEntryItems(tableName, field, where[field])
          }
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
      if (oldItem && oldItem[fieldName]) {
        const oldKey = getItemKey(tableName, fieldName, oldItem)
        if (oldItem[fieldName] !== item[fieldName] || oldKey !== key) {
          removeFromEntry(entries, oldItem[fieldName], oldKey)
        }
      }

      // Items without a value for the field aren't indexed under it
      if (!item[fieldName]) {
        continue
      }

      const field = fields[tableName][fieldName]
      const entry = entries.get(item[fieldName])
      if (!entry || (field && (field.isId || field.isUnique))) {
        // A new value, or a unique one, which this item alone holds
        entries.set(item[fieldName], new Map([[key, item]]))
      } else {
        // For non-unique fields, replace the earlier version of this item or add it
        entry.set(key, item)
      }
    }
  }

  /**
   * Removes an item from the index when it's deleted.
   * 
   * @param tableName - Name of the table
   * @param field - The field being used for deletion
   * @param item - The item being deleted
   */
  const deleteItemByField = (tableName: string, field: Prisma.DMMF.Field, item: any) => {
    if (!isEnabled) {
      return
    }

    // Remove this item, and only this item, from the entry of its value
    if (indexedFieldNames[tableName]) {
      if (indexedFieldNames[tableName].includes(field.name)) {
        const entries = items[tableName]?.[field.name]
        if (entries) {
          removeFromEntry(entries, item[field.name], getItemKey(tableName, field.name, item))
        }
      }
    }
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
    for (const tableName in indexedFieldNames) {
      for (const item of data[tableName] || []) {
        updateItem(tableName, item, null)
      }
    }
  }

  return {
    addIndexFieldIfNeeded,
    getIndexedItems,
    updateItem,
    deleteItemByField,
    rebuild,
  }

}