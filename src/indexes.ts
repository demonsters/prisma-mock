import { Prisma } from "@prisma/client"


export default function createIndexes() {

  let items: Map<string, Map<string, Map<string, any[]>>> = new Map()
  let indexedFieldNames: Map<string, string[]> = new Map()
  let fields: Map<string, Map<string, Prisma.DMMF.Field>> = new Map()
  let idFieldNames: Map<string, string[]> = new Map()

  const addIndexFieldIfNeeded = (tableName: string, field: Prisma.DMMF.Field) => {
    if (!indexedFieldNames.has(tableName)) {
      indexedFieldNames.set(tableName, [])
    }
    if (!fields.has(tableName)) {
      fields.set(tableName, new Map())
    }
    if (!idFieldNames.has(tableName)) {
      idFieldNames.set(tableName, [])
    }
    let thisFields = fields.get(tableName)
    let thisFieldNames = indexedFieldNames.get(tableName)
    let thisIdFieldNames = idFieldNames.get(tableName)
    if (thisFieldNames.includes(field.name)) return
    if (field.isId || field.isUnique) {
      thisFieldNames.push(field.name)
    }
    if (field.isId) {
      thisIdFieldNames.push(field.name)
    }
    if (!!field.relationFromFields?.length) {
      const fieldName = field.relationFromFields[0]
      thisFieldNames.push(fieldName)
    }
    thisFields.set(field.name, field)
  }

  const getIndexedItems = (tableName: string, where: any) => {
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
      if (indexedFieldNames.has(tableName)) {
        if (indexedFieldNames.get(tableName).includes(field)) {
          return items.get(tableName)?.get(field)?.get(where[field])
        }
      }
    }
  }

  const updateItem = (tableName: string, item: any) => {
    if (!items.has(tableName)) {
      items.set(tableName, new Map())
    }
    if (!indexedFieldNames.has(tableName)) {
      throw new Error(`No indexed fields for table ${tableName}`)
    }
    const tableItems = items.get(tableName)
    for (const fieldName of indexedFieldNames.get(tableName)) {
      if (!tableItems.has(fieldName)) {
        tableItems.set(fieldName, new Map())
      }
      if (!item[fieldName]) {
        tableItems.delete(fieldName)
        continue
      }
      const thisItems = tableItems.get(fieldName)
      if (!thisItems.has(item[fieldName])) {
        thisItems.set(item[fieldName], [item])
      } else {
        const field = fields.get(tableName).get(fieldName)
        if (field && (field.isId || field.isUnique)) {
          thisItems.set(item[fieldName], [item])
        } else {
          const array = thisItems.get(item[fieldName])
          if (array.length === 0) {
            array.push(item)
          } else {
            const thisIdFieldNames = idFieldNames.get(tableName) || []
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
    if (indexedFieldNames.has(tableName)) {
      if (indexedFieldNames.get(tableName).includes(field.name)) {
        items.get(tableName)?.get(field.name)?.delete(item[field.name])
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