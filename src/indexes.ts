import { Prisma } from "@prisma/client"


export default function createIndexes(isEnabled: boolean) {

  let items: Record<string, Record<string, Map<any, any[]>>> = {}
  let indexedFieldNames: Record<string, string[]> = {}
  let fields: Record<string, Record<string, Prisma.DMMF.Field>> = {}
  let idFieldNames: Record<string, string[]> = {}

  const addIndexFieldIfNeeded = (tableName: string, field: Prisma.DMMF.Field, isPrimary: boolean) => {
    if (!isEnabled) {
      return
    }
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
    if (field.isId || field.isUnique || isPrimary) {
      if (!thisFieldNames.includes(field.name)) {
        thisFieldNames.push(field.name)
      }
    }
    if (field.isId || isPrimary) {
      if (!thisIdFieldNames.includes(field.name)) {
        thisIdFieldNames.push(field.name)
      }
    }
    if (!!field.relationFromFields?.length) {
      const fieldName = field.relationFromFields[0]
      thisFieldNames.push(fieldName)
    }
    thisFields[field.name] = field
  }

  const getIndexedItems = (tableName: string, where: any) => {
    if (!isEnabled) {
      return null
    }
    for (const field in where) {
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
      if (indexedFieldNames[tableName]) {
        if (typeof where[field] === "object") {
          for (const key in where[field]) {
            if (indexedFieldNames[tableName].includes(key)) {
              return items[tableName]?.[field]?.get(where[field][key])
            }
          }
        } else {
          if (indexedFieldNames[tableName].includes(field)) {
            return items[tableName]?.[field]?.get(where[field])
          }
        }
      }

    }
  }

  const updateItem = (tableName: string, item: any, oldItem: any | null) => {
    if (!isEnabled) {
      return
    }
    if (!items[tableName]) {
      items[tableName] = {}
    }
    if (!indexedFieldNames[tableName]) {
      throw new Error(`No indexed fields for table ${tableName}`)
    }
    for (const fieldName of indexedFieldNames[tableName]) {
      if (!items[tableName][fieldName]) {
        items[tableName][fieldName] = new Map()
      }
      if (!item[fieldName]) {
        if (oldItem && oldItem[fieldName]) {
          const array = items[tableName][fieldName].get(oldItem[fieldName])
          if (array) {
            for (let i = 0; i < array.length; i++) {
              const oldItem = array[i]
              for (const thisIdFieldName of idFieldNames[tableName]) {
                if (item[thisIdFieldName] === oldItem[thisIdFieldName]) {
                  array.splice(i, 1)
                  i--
                  continue
                }
              }
            }
          }
        }
        continue
      }
      if (!items[tableName][fieldName].has(item[fieldName])) {
        items[tableName][fieldName].set(item[fieldName], [item])
      } else {
        const field = fields[tableName][fieldName]
        if (field && (field.isId || field.isUnique)) {
          items[tableName][fieldName].set(item[fieldName], [item])
        } else {
          const array = items[tableName][fieldName].get(item[fieldName])
          if (array.length === 0) {
            array.push(item)
          } else {
            const thisIdFieldNames = idFieldNames[tableName] || []
            let hasFound = false
            for (let i = 0; i < array.length; i++) {
              const oldItem = array[i]
              for (const thisIdFieldName of thisIdFieldNames) {
                if (item[thisIdFieldName] === oldItem[thisIdFieldName]) {
                  hasFound = true
                  array[i] = item
                  continue
                }
              }
            }
            if (!hasFound) {
              array.push(item)
            }
          }
        }
      }
    }
  }

  const deleteItemByField = (tableName: string, field: Prisma.DMMF.Field, item: any) => {
    if (!isEnabled) {
      return
    }
    if (indexedFieldNames[tableName]) {
      if (indexedFieldNames[tableName].includes(field.name)) {
        items[tableName]?.[field.name]?.delete(item[field.name])
      }
    }
  }

  return {
    addIndexFieldIfNeeded,
    getIndexedItems,
    updateItem,
    deleteItemByField
  }

}