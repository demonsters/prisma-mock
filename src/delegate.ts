import type { Prisma } from "@prisma/client"
import createHandleDefault from "./defaults"
import { throwKnownError, throwValidationError } from "./errors"
import createIndexes from "./indexes"
import { CreateArgs, Item } from "./types"
import { getCompoundKeys } from "./utils/compoundKeys"
import { createGetFieldRelationshipWhere, getCamelCase, isFieldDefault, removeMultiFieldIds } from "./utils/fieldHelpers"
import createMatch from "./utils/queryMatching"
import { getLookupValues, isLookupValue } from "./utils/lookupValues"

/**
 * Creates a delegate function that handles Prisma-like operations for a specific model
 * This is the main factory function that generates model-specific CRUD operations
 */
export const createDelegate = <P extends typeof Prisma>({ ref, prisma, datamodel = prisma.dmmf.datamodel, caseInsensitive, indexes }: {
  ref: any, // Reference to the mock data store
  prisma: P, // Prisma datamodel definition
  datamodel: P["dmmf"]["datamodel"], // Prisma datamodel definition
  caseInsensitive: boolean, // Whether string comparisons should be case insensitive
  indexes: ReturnType<typeof createIndexes>, // Index management for performance
}) => {

  // Initialize default value handler
  const handleDefaults = createHandleDefault()

  // Store many-to-many relationship data separately from the main data store
  const manyToManyData: { [relationName: string]: Array<{ [type: string]: Item }> } = {}

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

  // Create function to get relationship where clauses
  const getFieldRelationshipWhere = createGetFieldRelationshipWhere(datamodel, manyToManyData)

  /**
   * Finds the corresponding field in a join model for a given relation field
   * Used for many-to-many relationships to find the join table field
   */
  const getJoinField = (field: Prisma.DMMF.Field) => {
    const joinmodel = datamodel.models.find((model) => {
      return model.name === field.type
    })

    const joinfield = joinmodel?.fields.find((f) => {
      return f.relationName === field.relationName
    })
    return joinfield
  }

  /**
   * Creates a delegate for a specific model with all CRUD operations
   * @param prop - The model name in camelCase
   * @param model - The Prisma model definition
   */
  const createModelDelegate = (prop: string, model: Prisma.DMMF.Model) => {

    const getDelegateForFieldName = (field: Prisma.DMMF.Field["type"]) => {
      const name = getCamelCase(field)
      const otherModel = datamodel.models.find((model) => {
        return name === getCamelCase(model.name)
      })
      return Delegate(name, otherModel)
    }


    // Create matching function for WHERE clauses
    const matchFnc = createMatch({ prisma, getFieldRelationshipWhere, getDelegateForFieldName, model, datamodel, caseInsensitive, ref })

    /**
     * Sorting function that handles both simple and nested orderBy clauses
     * Supports multiple sort criteria and nested relation sorting
     */
    const sortFunc = (orderBy) => (a, b) => {
      // Handle array of orderBy clauses (multiple sort criteria)
      if (Array.isArray(orderBy)) {
        for (const order of orderBy) {
          const res = sortFunc(order)(a, b)
          if (res !== 0) {
            return res
          }
        }
        return 0
      }

      // Validate that only one sort field is provided
      const keys = Object.keys(orderBy)
      if (keys.length > 1) {
        throwValidationError(prisma,
          `Argument orderBy of needs exactly one argument, but you provided ${keys.join(
            " and "
          )}. Please choose one.`
        )
      }

      // Create include function to handle nested relations during sorting
      const incl = includes({
        include: keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
      })

      for (const key of keys) {
        const dir = orderBy[key]

        // Handle nested relation sorting
        if (typeof dir === "object") {
          const schema = model.fields.find((field) => {
            return field.name === key
          })
          if (!schema) {
            return 0
          }
          const delegate = getDelegateForFieldName(schema.type)
          const valA = incl(a)
          const valB = incl(b)
          if (!valB || !valB[key]) {
            return 0
          }
          if (!valA || !valA[key]) {
            return 0
          }
          const res = delegate._sortFunc(dir)(valA[key], valB[key])
          if (res !== 0) {
            return res
          }
        } else if (!!a && !!b) {
          // Handle simple field sorting
          if (a[key] > b[key]) {
            return dir === "asc" ? 1 : -1
          } else if (a[key] < b[key]) {
            return dir === "asc" ? -1 : 1
          }
        }
      }
      return 0
    }

    /**
     * Handles nested updates including relations, scalar operations, and default values
     * This is the core function that processes create/update data
     */
    // One string per combination of values, or undefined when a value has no exact JSON
    // form, which then never equals the value of the row being created
    const getCompoundValue = (row: any, fields: readonly string[]) => {
      const values = fields.map((field) => row[field])
      const encodable = values.every((value) =>
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))
      )
      return encodable ? JSON.stringify(values) : undefined
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

    // The fields rows can be looked up by, as the index does: ids, unique fields and foreign keys
    let lookupFieldNames: Set<string> | null = null
    const getLookupFieldNames = () => {
      if (!lookupFieldNames) {
        const tableModel = datamodel.models.find((model) => getCamelCase(model.name) === prop)
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
      const tableModel = datamodel.models.find((model) => getCamelCase(model.name) === prop)
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

    const getTableModel = () => datamodel.models.find((model) => getCamelCase(model.name) === prop)

    const holdsCompoundKey = (row: any) =>
      getCompoundKeys(getTableModel()).some(({ name }) => name in row)

    // The rows array a running createMany published as this table's version, which create
    // appends to in place instead of copying the table for every row. Once the createMany
    // returns, it is a version like any other, which nothing changes again
    let batchRows: any[] | null = null

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

    const nestedUpdate = (args, isCreating: boolean, item: any) => {
      let inputData = args.data

      // Remove undefined values from input data
      if (inputData) {
        Object.entries(inputData).forEach(([key, value]) => {
          if (typeof value === "undefined") {
            delete inputData[key]
          }
        })
      }

      // Get field schema for default values
      const model = datamodel.models.find((model) => {
        return getCamelCase(model.name) === prop
      })


      model.fields.forEach((field) => {
        if (inputData[field.name]) {
          let inputFieldData = inputData[field.name]

          // Check for unique constraint violations during creation
          if (isCreating && (field.isUnique || field.isId)) {
            const existing = isLookupValue(inputFieldData)
              ? getFieldRows(field.name).has(inputFieldData)
              : findOne({ where: { [field.name]: inputFieldData } })
            if (existing) {
              throwKnownError(prisma,
                `Unique constraint failed on the fields: (\`${field.name}\`)`,
                { code: 'P2002', meta: { modelName: model.name, target: [field.name] } },
              )
            }
          }

          // Handle relation fields (object type)
          if (field.kind === "object") {
            // Handle set operation for many-to-many relations
            if (inputFieldData.set) {
              const {
                [field.name]: { set },
                ...rest
              } = inputData

              const otherModel = datamodel.models.find((model) => {
                return model.name === field.type
              })
              const otherField = otherModel.fields.find(
                (otherField) =>
                  field.relationName === otherField.relationName
              )
              const delegate = getDelegateForFieldName(field.type)
              const items = inputFieldData.set.map(where => delegate.findUnique({
                where
              })).filter(Boolean)

              if (items.length !== inputFieldData.set.length) {
                throwKnownError(prisma, `An operation failed because it depends on one or more records that were required but not found. Expected ${inputFieldData.set.length} records to be connected, found only ${items.length}.`)
              }

              // Update many-to-many data store
              const idField = model?.fields.find((f) => f.isId)?.name
              let a = manyToManyData[field.relationName] = manyToManyData[field.relationName] || []
              a = a.filter(i => i[otherField.type][idField] !== item[idField])
              items.forEach((createdItem) => {
                a.push({
                  [field.type]: createdItem,
                  [otherField.type]: item || inputData
                })
              })
              manyToManyData[field.relationName] = a

              inputData = rest
            }

            // Handle connect operation for relations
            if (inputFieldData.connect) {
              const {
                [field.name]: { connect },
                ...rest
              } = inputData
              const connections = connect instanceof Array ? connect : [connect]
              connections.forEach((connect, idx) => {
                const keyToMatch = Object.keys(connect)[0]

                const keyToGet = field.relationToFields[0]
                const targetKey = field.relationFromFields[0]
                const delegate = getDelegateForFieldName(field.type)

                if (keyToGet && targetKey) {
                  let connectionValue = connect[keyToGet]
                  if (keyToMatch !== keyToGet) {
                    // Try to find by unique index if direct match fails
                    let matchingRow = delegate.findOne({
                      where: connect
                    })
                    if (!matchingRow) {
                      throwKnownError(prisma,
                        "An operation failed because it depends on one or more records that were required but not found. {cause}"
                      )
                    }
                    connectionValue = matchingRow[keyToGet]
                  }
                  if (targetKey) {
                    inputData = {
                      ...rest,
                      [targetKey]: connectionValue,
                    }
                  }
                } else {
                  inputData = rest
                  const newData = {
                    ...item,
                    ...inputData,
                  }
                  const otherModel = datamodel.models.find((model) => {
                    return model.name === field.type
                  })
                  const otherField = otherModel.fields.find(
                    (otherField) =>
                      field.relationName === otherField.relationName
                  )

                  const otherTargetKey = otherField.relationToFields[0]
                  if ((!targetKey && !keyToGet) && otherTargetKey) {
                    delegate.update({
                      where: connect,
                      data: {
                        [getCamelCase(otherField.name)]: {
                          connect: {
                            [otherTargetKey]: newData[otherTargetKey],
                          }
                        }
                      }
                    })
                  } else {
                    const a = manyToManyData[field.relationName] = manyToManyData[field.relationName] || []
                    a.push({
                      [field.type]: delegate.findOne({
                        where: connect
                      }),
                      [otherField.type]: item || newData
                    })
                  }
                }
              })
            }

            // Handle upsert operation
            if (inputFieldData.upsert) {
              const args = inputFieldData.upsert

              const delegate = getDelegateForFieldName(field.type)
              const res = delegate.findOne(args)
              if (res) {
                delegate.update({
                  where: args.where,
                  data: args.update,
                })
              } else {
                inputFieldData = {
                  ...inputFieldData,
                  create: inputFieldData.upsert.create,
                }
              }
            }

            // Handle create operations for relations
            if (inputFieldData.create || inputFieldData.createMany) {

              const { [field.name]: _create, ...rest } = inputData
              inputData = rest

              const delegate = getDelegateForFieldName(field.type)

              const joinfield = getJoinField(field)

              if (field.relationFromFields.length > 0) {
                // One-to-many relation: create the related item and set foreign key
                const item = delegate.create({
                  data: inputFieldData.create,
                })
                inputData = {
                  ...rest,
                  [field.relationFromFields[0]]:
                    item[field.relationToFields[0]],
                }
              } else {
                // Many-to-many relation: create items and manage join table
                const map = (val) => {
                  if (joinfield.relationToFields.length === 0) {
                    return val
                  }
                  return ({
                    ...val,
                    [joinfield.name]: {
                      connect: joinfield.relationToFields.reduce(
                        (prev, cur, index) => {
                          let val = inputData[cur]
                          if (!isCreating && !val) {
                            val = findOne(args)[cur]
                          }
                          return {
                            ...prev,
                            [cur]: val,
                          }
                        },
                        {}
                      ),
                    },
                  })
                }

                let createdItems = []
                if (inputFieldData.createMany) {
                  createdItems = delegate._createMany({
                    ...inputFieldData.createMany,
                    data: inputFieldData.createMany.data.map(map),
                  })
                } else {
                  const data = inputFieldData.create
                  if (Array.isArray(data)) {
                    createdItems = delegate._createMany({
                      ...data,
                      data: data.map(map),
                    })
                  } else {
                    createdItems = [delegate.create({
                      ...data,
                      data: map(data),
                    })]
                  }
                }

                const targetKey = joinfield.relationFromFields[0]

                if (!targetKey) {
                  const a = manyToManyData[field.relationName] = manyToManyData[field.relationName] || []
                  createdItems.forEach((createdItem) => {
                    a.push({
                      [field.type]: createdItem,
                      [joinfield.type]: item || inputData
                    })
                  })
                }

              }
            }

            // Handle update operations for relations
            const name = getCamelCase(field.type)
            const delegate = getDelegateForFieldName(field.type)
            if (inputFieldData.updateMany) {
              if (Array.isArray(inputFieldData.updateMany)) {
                inputFieldData.updateMany.forEach((updateMany) => {
                  delegate.updateMany(updateMany)
                })
              } else {
                delegate.updateMany(inputFieldData.updateMany)
              }
            }
            if (inputFieldData.update) {
              if (Array.isArray(inputFieldData.update)) {
                inputFieldData.update.forEach((update) => {
                  delegate.update(update)
                })
              } else {
                const item = findOne(args)
                if (field.isList) {
                  const otherModel = datamodel.models.find((model) => {
                    return model.name === field.type
                  })
                  const where = getFieldRelationshipWhere(item, field, otherModel)
                  const delegate = Delegate(name, otherModel)
                  delegate.update({
                    data: inputFieldData.update.data,
                    where: where ? {
                      AND: [
                        inputFieldData.update.where,
                        where
                      ]
                    } : inputFieldData.update.where,
                  })
                } else {
                  const where = getFieldRelationshipWhere(item, field, model)
                  if (where) {
                    delegate.update({
                      data: inputFieldData.update,
                      where,
                    })
                  }
                }
              }
            }

            // Handle delete operations for relations
            if (inputFieldData.deleteMany) {
              if (Array.isArray(inputFieldData.deleteMany)) {
                inputFieldData.deleteMany.forEach((where) => {
                  delegate.deleteMany({ where })
                })
              } else {
                delegate.deleteMany({ where: inputFieldData.deleteMany })
              }
            }
            if (inputFieldData.delete) {
              if (Array.isArray(inputFieldData.delete)) {
                inputFieldData.delete.forEach((where) => {
                  delegate.delete({ where })
                })
              } else {
                delegate.delete({ where: inputFieldData.delete })
              }
            }

            // Handle disconnect operation
            if (inputFieldData.disconnect) {
              if (field.relationFromFields.length > 0) {
                inputData = {
                  ...inputData,
                  [field.relationFromFields[0]]: null,
                }
              } else {
                const joinfield = getJoinField(field)
                delegate.update({
                  data: {
                    [joinfield.relationFromFields[0]]: null,
                  },
                  where: {
                    [joinfield.relationFromFields[0]]:
                      item[joinfield.relationToFields[0]],
                  },
                })
              }
            }
            const { [field.name]: _update, ...rest } = inputData
            inputData = rest
          }

          // Handle scalar field operations
          if (field.kind === "scalar") {
            if (inputFieldData.increment) {
              inputData = {
                ...inputData,
                [field.name]: item[field.name] + inputFieldData.increment,
              }
            }
            if (inputFieldData.decrement) {
              inputData = {
                ...inputData,
                [field.name]: item[field.name] - inputFieldData.decrement,
              }
            }
            if (inputFieldData.multiply) {
              inputData = {
                ...inputData,
                [field.name]: item[field.name] * inputFieldData.multiply,
              }
            }
            if (inputFieldData.divide) {
              const newValue = item[field.name] / inputFieldData.divide
              inputData = {
                ...inputData,
                [field.name]:
                  field.type === "Int" ? Math.floor(newValue) : newValue,
              }
            }
            if (inputFieldData.set) {
              inputData = {
                ...inputData,
                [field.name]: inputFieldData.set,
              }
            }
          }
        }

        // Handle default values and special field types
        if (
          (isCreating || inputData[field.name] === null) &&
          (inputData[field.name] === null || inputData[field.name] === undefined)
        ) {
          if (field.hasDefaultValue) {
            if (isFieldDefault(field.default)) {
              const defaultValue = handleDefaults(prop, field, ref)
              if (defaultValue) {
                inputData = {
                  ...inputData,
                  [field.name]: defaultValue,
                }
              }
            } else {
              inputData = {
                ...inputData,
                [field.name]: field.default,
              }
            }
          } else if (field.isUpdatedAt) {
            // Auto-update updatedAt fields
            inputData = {
              ...inputData,
              [field.name]: new Date(),
            }
          } else {
            if (field.kind !== "object") {
              inputData = {
                ...inputData,
                [field.name]: null,
              }
            }
          }
        }
        // return field.name === key
      })
      if (model.name === "Stripe") {
        model //?
        inputData //?
      }
      return inputData
    }

    /**
     * Finds a single record matching the given criteria
     * Returns null if no record is found
     */
    // Whether the result is every match in table order, with nothing ordering, windowing or
    // deduplicating it, so the first match is the first row of the result
    const isPlainQuery = (args: any) =>
      !args?.orderBy &&
      !args?.distinct &&
      args?.skip === undefined &&
      args?.take === undefined &&
      args?.cursor === undefined

    const findOne = (args: any) => {
      if (!ref.data[prop]) return null
      if (isPlainQuery(args)) {
        // The rest of the table needn't be matched or shaped once a row matches
        const match = matchFnc(args?.where)
        for (const row of getRowsToMatch(args?.where)) {
          if (match(row)) {
            return findMany({ ...args, where: undefined }, [row])[0]
          }
        }
        return null
      }
      const items = findMany(args)
      if (items.length === 0) {
        return null
      }
      return items[0]
    }

    /**
     * Finds a single record or throws an error if not found
     */
    const findOrThrow = (args) => {
      const found = findOne(args)
      if (!found) {
        throwKnownError(prisma, `No ${prop.slice(0, 1).toUpperCase()}${prop.slice(1)} found`, {
          meta: { cause: "No record was found for a query.", modelName: model.name },
        })
      }
      return found
    }

    /**
     * Finds multiple records matching the given criteria
     * Handles filtering, sorting, pagination, and includes
     */
    /**
     * The rows a where clause can match, in table order: the ones the index holds for it, the
     * ones the lookup by value finds when the index can't answer (or is disabled), or the
     * whole table
     */
    const getRowsToMatch = (where: any) => {
      const rows = ref.data[prop] || []
      const indexed = indexes.getIndexedItems(prop, where, rows)
      if (indexed) {
        return indexed
      }
      const candidates = getCandidateRows(where)
      if (candidates) {
        return getCandidateIndexes(rows, candidates).map((index) => rows[index])
      }
      return rows
    }

    const findMany = (args, candidates?: any[]) => {
      const match = matchFnc(args?.where)
      const inc = includes(args)
      // `candidates` limits the rows considered, for callers that already know them
      let items = candidates || getRowsToMatch(args?.where)

      let res = []
      for (const item of items) {
        if (match(item)) {
          const i = inc(item)
          res.push(i)
        }
      }

      // Handle distinct filtering
      if (args?.distinct) {
        let values = {}
        res = res.filter((item) => {
          let shouldInclude = true
          args.distinct.forEach((key) => {
            const vals = values[key] || []
            if (vals.includes(item[key])) {
              shouldInclude = false
            } else {
              vals.push(item[key])
              values[key] = vals
            }
          })
          return shouldInclude
        })
      }

      // Apply sorting
      if (args?.orderBy) {
        res.sort(sortFunc(args?.orderBy))
      }

      // Apply field selection
      if (args?.select) {
        res = res.map((item) => {
          const newItem = {}
          Object.keys(args.select).forEach((key) => (newItem[key] = item[key]))
          return newItem
        })
      }

      // Apply cursor-based pagination
      if (args?.cursor !== undefined) {
        const cursorVal = res.findIndex((r) => Object.keys(args?.cursor).every((key) => r[key] === args?.cursor[key]))
        res = res.slice(cursorVal)
      }

      // Apply skip/take pagination
      if (args?.skip !== undefined || args?.take !== undefined) {
        const start = args?.skip !== undefined ? args?.skip : 0
        const end = args?.take !== undefined ? start + args.take : undefined
        res = res.slice(start, end)
      }

      // Replace Prisma null types with JavaScript null
      res = res.map((item) => {
        const newItem = {}
        Object.keys(item).forEach((key) => {
          if (item[key] === prisma.JsonNull || item[key] === prisma.DbNull) {
            newItem[key] = null
          } else {
            newItem[key] = item[key]
          }
        })
        return newItem
      })
      return res
    }

    /**
     * Updates multiple records matching the given criteria
     * Returns the updated data and count of updated records
     */
    const updateMany = (args) => {
      let nbUpdated = 0
      const updatedIndexes = []
      const match = matchFnc(args.where)
      const rows = ref.data[prop]
      const newItems = rows.map((e, index) => {
        if (match(e)) {
          let data = nestedUpdate(args, false, e)
          nbUpdated++
          const newItem = {
            ...e,
            ...data,
          }
          indexes.updateItem(prop, newItem, e)
          updatedIndexes.push(index)
          return newItem
        }
        return e
      })
      ref.data = {
        ...ref.data,
        [prop]: newItems,
      }
      removeCompoundKeyFields(rows, updatedIndexes.map((index) => newItems[index]))
      // removeMultiFieldIds keeps every row at its index, so the updated rows are picked
      // by position rather than searched for with one where clause per row
      const data = findMany(
        { include: args.include },
        updatedIndexes.map((index) => ref.data[prop][index])
      )
      return { data, nbUpdated }
    }

    /**
     * Creates a new record with the given data
     * Handles default values, unique constraints, and indexes
     */
    const create = (args: CreateArgs) => {
      // Get field schema for default values
      const model = datamodel.models.find((model) => {
        return getCamelCase(model.name) === prop
      })

      const d = nestedUpdate(args, true, null)

      // Check compound @@id and @@unique constraint violations during creation
      for (const { name, fields } of getCompoundKeys(model)) {
        const hasAllValues = fields.every((f) => d[f] !== undefined && d[f] !== null)
        if (hasAllValues) {
          const compoundValue = getCompoundValue(d, fields)
          const existing = compoundValue !== undefined
            ? getCompoundRows(name, fields).has(compoundValue)
            : findOne({ where: { [name]: fields.reduce((acc, f) => ({ ...acc, [f]: d[f] }), {}) } })
          if (existing) {
            throwKnownError(prisma,
              `Unique constraint failed on the fields: (\`${fields.join("`, `")}\`)`,
              { code: "P2002", meta: { modelName: model.name, target: fields } },
            )
          }
        }
      }

      const previousRows = ref.data[prop] || []
      // A copy, so the caller's data object never doubles as the stored row
      const row = { ...d }
      let rows
      if (batchRows !== null && previousRows === batchRows) {
        rows = appendBatchRow(row)
      } else {
        const appended = [...previousRows, row]
        ref.data = {
          ...ref.data,
          [prop]: appended,
        }
        removeCompoundKeyFields(previousRows, [row])
        rows = ref.data[prop]
        // When the table only grew by this row, the rows by value carry over with it added
        if (rows === appended) {
          carryValueRows(previousRows, rows, [], [rows[rows.length - 1]])
        }
      }

      // The new row is the last one, removeMultiFieldIds keeps every row at its index.
      // The index gets the stored row, not the copy that select / include shape for the caller
      const item = rows[rows.length - 1]
      indexes.updateItem(prop, item, null)
      return findMany({ ...args, where: undefined }, [item])[0]
    }

    /**
     * Creates multiple records with the given data
     * Supports skipDuplicates option to handle unique constraint violations
     */
    const createMany = (args) => {
      const skipDuplicates = args.skipDuplicates ?? false
      const rowsData = Array.isArray(args.data) ? args.data : [args.data]
      const outerBatchRows = batchRows
      if (rowsData.length > 1) {
        // One copy of the table for the whole batch, published as its next version, which the
        // creates below append to in place. The creates run synchronously, so nothing outside
        // this call sees the array before it's complete
        const previousRows = ref.data[prop] || []
        batchRows = [...previousRows]
        ref.data = {
          ...ref.data,
          [prop]: batchRows,
        }
        carryValueRows(previousRows, batchRows, [], [])
        if (cleanRows.get(previousRows) === previousRows.length) {
          cleanRows.set(batchRows, batchRows.length)
        }
      }
      try {
        return rowsData
          .map((data) => {
            try {
              return create({ ...args, data })
            } catch (error) {
              if (skipDuplicates && error["code"] === "P2002") {
                return null
              }
              throw error
            }
          }
          )
          .filter((item) => item !== null)
      } finally {
        batchRows = outerBatchRows
      }
    }

    /**
     * Deletes multiple records matching the given criteria
     * Handles referential actions (cascade, set null) for related records
     */
    const deleteMany = (args) => {
      const model = datamodel.models.find((model) => {
        return getCamelCase(model.name) === prop
      })

      const deleted = []
      const match = matchFnc(args?.where)
      const rows = ref.data[prop]
      // A unique where only has the rows holding its value to match, which are then taken
      // out of a copy of the table rather than filtering every row of it
      const candidates = getCandidateRows(args?.where)
      let remaining
      if (candidates) {
        const deletedIndexes = getCandidateIndexes(rows, candidates).filter((index) => match(rows[index]))
        if (deletedIndexes.length <= 16) {
          remaining = rows.slice()
          for (let i = deletedIndexes.length - 1; i >= 0; i--) {
            remaining.splice(deletedIndexes[i], 1)
          }
        } else {
          const deletedIndexSet = new Set(deletedIndexes)
          remaining = rows.filter((_, index) => !deletedIndexSet.has(index))
        }
        deleted.push(...deletedIndexes.map((index) => rows[index]))
      } else {
        remaining = rows.filter((e) => {
          const shouldDelete = match(e)
          if (shouldDelete) {
            deleted.push(e)
          }
          return !shouldDelete
        })
      }
      ref.data = {
        ...ref.data,
        [prop]: remaining,
      }
      carryValueRows(rows, remaining, deleted, [])
      // Taking rows out of a version without compound key fields leaves it without any
      if (cleanRows.get(rows) === rows.length) {
        cleanRows.set(remaining, remaining.length)
      }

      // Out of the index before the referential actions run, which may look this table up
      deleted.forEach((item) => indexes.deleteItem(prop, item))

      // Handle referential actions for deleted records
      deleted.forEach((item) => {

        model.fields.forEach((field) => {

          const joinfield = getJoinField(field)
          if (!joinfield) return
          const delegate = getDelegateForFieldName(field.type)
          if (joinfield.relationOnDelete === "SetNull") {
            delegate.update({
              where: {
                [joinfield.relationFromFields[0]]:
                  item[joinfield.relationToFields[0]],
              },
              data: {
                [joinfield.relationFromFields[0]]: null,
              },
              skipForeignKeysChecks: true,
            })
          } else if (joinfield.relationOnDelete === "Cascade") {
            try {
              delegate.delete({
                where: {
                  [joinfield.relationFromFields[0]]:
                    item[joinfield.relationToFields[0]],
                },
              })
            } catch (e) { }
          }
        })
      })

      return deleted
    }

    /**
     * Handles include and select operations for relations
     * Resolves nested relations and applies filtering
     */
    const includes = (args: any) => (item: any) => {
      if ((!args?.include && !args?.select) || !item) return item
      let newItem = item
      const obj = args?.select || args?.include
      const keys = Object.keys(obj)

      keys.forEach((key) => {
        // Get field schema for relation info
        const model = datamodel.models.find((model) => {
          return getCamelCase(model.name) === prop
        })

        if (!obj[key]) {
          return
        }

        // Handle _count aggregation
        if (key === "_count") {
          const select = obj[key]?.select

          const subkeys = Object.keys(select)
          let _count = {}
          subkeys.forEach((subkey) => {

            const schema = model.fields.find((field) => {
              return field.name === subkey
            })

            if (!schema?.relationName) {
              return
            }

            // Get delegate for relation
            const delegate = getDelegateForFieldName(schema.type)
            const joinWhere = getFieldRelationshipWhere(item, schema, model)

            _count = {
              ..._count,
              [subkey]: delegate.count({ where: joinWhere }),
            }
          })

          newItem = {
            ...newItem,
            _count
          }
          return
        }

        const schema = model.fields.find((field) => {
          return field.name === key
        })

        if (!schema?.relationName) {
          return
        }

        const submodel = datamodel.models.find((model) => {
          return model.name === schema.type
        })

        // Get delegate for relation
        const delegate = Delegate(getCamelCase(schema.type), submodel)

        // Construct arg for relation query
        let subArgs = obj[key] === true ? {} : obj[key]
        const joinWhere = getFieldRelationshipWhere(item, schema, model)
        if (joinWhere) {
          subArgs = {
            ...subArgs,
            where: {
              ...subArgs.where,
              ...joinWhere,
            },
          }

          if (schema.isList) {
            // Add relation for one-to-many or many-to-many
            newItem = {
              ...newItem,
              [key]: delegate._findMany(subArgs),
            }
          } else {
            // Add relation for one-to-one
            newItem = {
              ...newItem,
              [key]: delegate._findMany(subArgs)?.[0] || null,
            }
          }
        } else {
          newItem = {
            ...newItem,
            [key]: [],
          }
        }
      })
      return newItem
    }

    /**
     * Updates a single record matching the given criteria
     * Throws an error if no record is found (unless skipForeignKeysChecks is true)
     */
    const update = (args) => {
      let updatedItem
      let updatedIndex = -1
      let hasMatch = false
      const updatedIndexes = []
      const match = matchFnc(args.where)
      const rows = ref.data[prop]
      const updateRow = (e, index) => {
        hasMatch = true
        updatedIndex = index
        updatedIndexes.push(index)
        let data = nestedUpdate(args, false, e)
        updatedItem = {
          ...e,
          ...data,
        }
        indexes.updateItem(prop, updatedItem, e)
        return updatedItem
      }
      // A unique where narrows the rows to match down to the ones holding its value, matched
      // in table order. Their indexes are taken first, as nested writes may add to the set
      const candidates = rows && getCandidateRows(args.where)
      let newItems
      if (candidates) {
        newItems = rows.slice()
        for (const index of getCandidateIndexes(rows, candidates)) {
          if (match(rows[index])) {
            newItems[index] = updateRow(rows[index], index)
          }
        }
      } else {
        newItems = rows?.map((e, index) => (match(e) ? updateRow(e, index) : e))
      }
      if (!hasMatch) {
        if (args.skipForeignKeysChecks) return
        throwKnownError(prisma,
          "An operation failed because it depends on one or more records that were required but not found. Record to update not found.",
          { meta: { cause: "No record was found for an update.", modelName: model.name } }
        )
      }
      ref.data = {
        ...ref.data,
        [prop]: newItems,
      }
      removeCompoundKeyFields(rows, updatedIndexes.map((index) => newItems[index]))
      const updatedRows = ref.data[prop]

      // When only the updated rows changed, the rows by value carry over with each updated
      // row swapped for its new version
      if (updatedRows === newItems) {
        carryValueRows(
          rows,
          updatedRows,
          updatedIndexes.map((index) => rows[index]),
          updatedIndexes.map((index) => updatedRows[index])
        )
      }

      // removeMultiFieldIds keeps every row at its index, so the updated row is picked by
      // position rather than searched for with all of its fields as the where clause
      return findMany({ ...args, where: undefined }, [updatedRows[updatedIndex]])[0]
    }

    /**
     * Returns a function that throws an error for unimplemented operations
     */
    const notImplemented = (name: string) => () => {
      throw new Error(`${name} is not yet implemented in prisma-mock`)
    }

    /**
     * Aggregates data based on the given arguments
     * Supports _count, _avg, _sum, _min, and _max
     */
    const aggregate = (args) => {
      const items = findMany({ where: args?.where || {} })

      const result: any = {}

      if (args?._count) {
        result._count = {}
        for (const field of Object.keys(args._count)) {
          if (args._count[field]) {
            result._count[field] = items.length
          }
        }
      }

      if (args?._avg) {
        result._avg = {}
        for (const field of Object.keys(args._avg)) {
          if (args._avg[field]) {
            const values = items.map(item => item[field]).filter(val => typeof val === 'number')
            result._avg[field] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null
          }
        }
      }

      if (args?._sum) {
        result._sum = {}
        for (const field of Object.keys(args._sum)) {
          if (args._sum[field]) {
            const values = items.map(item => item[field]).filter(val => typeof val === 'number')
            result._sum[field] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) : null
          }
        }
      }

      if (args?._min) {
        result._min = {}
        for (const field of Object.keys(args._min)) {
          if (args._min[field]) {
            const values = items.map(item => item[field]).filter(val => val !== null && val !== undefined)
            result._min[field] = values.length > 0 ? Math.min(...values) : null
          }
        }
      }

      if (args?._max) {
        result._max = {}
        for (const field of Object.keys(args._max)) {
          if (args._max[field]) {
            const values = items.map(item => item[field]).filter(val => val !== null && val !== undefined)
            result._max[field] = values.length > 0 ? Math.max(...values) : null
          }
        }
      }

      return result
    }


    const groupBy = (args) => {
      const { by, _count, _avg, _sum, _min, _max, having, orderBy } = args || {}

      // Field to aggregate in having

      const havingFields: any = having ? Object.keys(having).reduce((curr, field) => {
        const aggregations = Object.keys(having[field])
        return aggregations.reduce((p, aggregation) => {
          const curr = p[aggregation]
          p[aggregation] = {
            ...curr,
            [field]: true
          }
          return p
        }, curr)
      }, {}) : {}


      // Get all items that match the where clause
      const items = findMany({ where: args?.where })

      // Group items by the specified fields
      const groups = new Map()

      for (const item of items) {
        const groupKey = by.map(field => item[field]).join('|')

        if (!groups.has(groupKey)) {
          groups.set(groupKey, [])
        }
        groups.get(groupKey).push(item)
      }

      // Convert groups to result format
      const result = []

      for (const [groupKey, groupItems] of groups) {
        const groupValues = groupKey.split('|')
        const groupObj: any = {}

        // Add group by fields
        by.forEach((field, index) => {
          groupObj[field] = groupValues[index]
        })

        // Add aggregations
        const countField = { ...havingFields._count, ..._count }
        const countFields = Object.keys(countField)
        if (countFields.length > 0) {
          groupObj._count = {}
          for (const field of countFields) {
            if (field === '_all') {
              groupObj._count._all = groupItems.length
            } else if (countField[field]) {
              groupObj._count[field] = groupItems.filter(item => item[field] !== null && item[field] !== undefined).length
            }
          }
        }

        const avgField = { ...havingFields._avg, ..._avg }
        const avgFields = Object.keys(avgField)
        if (avgFields.length > 0) {
          groupObj._avg = {}
          for (const field of avgFields) {
            if (avgField[field]) {
              const values = groupItems.map(item => item[field]).filter(val => typeof val === 'number')
              groupObj._avg[field] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null
            }
          }
        }

        const sumField = { ...havingFields._sum, ..._sum }
        const sumFields = Object.keys(sumField)
        if (sumFields.length > 0) {
          groupObj._sum = {}
          for (const field of sumFields) {
            if (_sum[field]) {
              const values = groupItems.map(item => item[field]).filter(val => typeof val === 'number')
              groupObj._sum[field] = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) : null
            }
          }
        }

        const minField = { ...havingFields._min, ..._min }
        const minFields = Object.keys(minField)
        if (minFields.length > 0) {
          groupObj._min = {}
          for (const field of minFields) {
            if (_min[field]) {
              const values = groupItems.map(item => item[field]).filter(val => val !== null && val !== undefined)
              groupObj._min[field] = values.length > 0 ? Math.min(...values) : null
            }
          }
        }

        const maxField = { ...havingFields._max, ..._max }
        const maxFields = Object.keys(maxField)
        if (maxFields.length > 0) {
          groupObj._max = {}
          for (const field of maxFields) {
            if (_max[field]) {
              const values = groupItems.map(item => item[field]).filter(val => val !== null && val !== undefined)
              groupObj._max[field] = values.length > 0 ? Math.max(...values) : null
            }
          }
        }

        result.push(groupObj)
      }

      // Apply having filter if provided
      if (having) {
        // Simple having implementation - can be extended for more complex conditions
        const filteredResult = result.filter(group => {
          for (const [aggregation, conditions] of Object.entries(having)) {
            for (const [fieldName, operatorValue] of Object.entries(conditions)) {
              const operator = Object.keys(operatorValue)[0]
              const value = operatorValue[operator]
              const groupValue = group[fieldName][aggregation]
              if (operator === 'gt' && groupValue <= value) return false
              if (operator === 'gte' && groupValue < value) return false
              if (operator === 'lt' && groupValue >= value) return false
              if (operator === 'lte' && groupValue > value) return false
              if (operator === 'equals' && groupValue !== value) return false
            }
          }
          return true
        })

        // Strip all having fields from result (if not in aggregate)
        if (havingFields) {
          return filteredResult.map(group => {
            const newGroup: any = {}
            Object.keys(group).forEach(field => {
              if (!(havingFields[field] && !args[field])) {
                newGroup[field] = group[field]
              }
            })
            return newGroup
          })
        }
        return filteredResult
      }

      // Apply orderBy if provided
      if (orderBy) {
        result.sort((a, b) => {
          for (const order of Array.isArray(orderBy) ? orderBy : [orderBy]) {
            const field = Object.keys(order)[0]
            const direction = order[field]
            const aVal = a[field]
            const bVal = b[field]

            if (aVal < bVal) return direction === 'asc' ? -1 : 1
            if (aVal > bVal) return direction === 'asc' ? 1 : -1
          }
          return 0
        })
      }

      return result
    }

    // Return the delegate object with all CRUD operations
    return {
      aggregate,
      groupBy,
      findOne,
      findUnique: findOne,
      findUniqueOrThrow: findOrThrow,
      findMany,
      findFirst: findOne,
      findFirstOrThrow: findOrThrow,
      create,
      createMany: (args) => {
        const createdItems = createMany(args)
        return { count: createdItems.length }
      },
      createManyAndReturn: (args) => {
        const createdItems = createMany(args)
        return createdItems
      },
      delete: (args) => {
        // Deleting finds the row as well, so it isn't looked up separately first
        const deleted = deleteMany(args)
        if (!deleted.length) {
          throwKnownError(prisma,
            "An operation failed because it depends on one or more records that were required but not found. Record to delete does not exist.",
            { meta: { cause: "No record was found for a delete.", modelName: model.name } }
          )
        }
        return deleted[0]
      },
      update,
      deleteMany: (args) => {
        const deleted = deleteMany(args)
        return { count: deleted.length }
      },
      updateMany: (args) => {
        const { nbUpdated } = updateMany(args)
        return { count: nbUpdated }
      },
      updateManyAndReturn: (args) => {
        const { data, nbUpdated } = updateMany(args)
        return data
      },

      /**
       * Upsert operation: update if exists, create if not
       */
      upsert(args) {
        const res = findOne(args)
        if (res) {
          return update({
            ...args,
            data: args.update,
          })
        } else {
          create({
            ...args,
            data: {
              ...args.where,
              ...args.create,
            },
          })
          return findOne(args)
        }
      },

      /**
       * Count operation: returns the number of records matching the criteria
       */
      count(args) {
        // Ordering doesn't change a count, and without a window there are no rows to shape
        if (isPlainQuery({ ...args, orderBy: undefined })) {
          const match = matchFnc(args?.where)
          let count = 0
          for (const row of getRowsToMatch(args?.where)) {
            if (match(row)) {
              count++
            }
          }
          return count
        }
        const res = findMany(args)
        return res.length
      },

      // Internal methods
      _sortFunc: sortFunc,
      _findMany: findMany,
      _createMany: createMany,
    }
  }
  // One delegate per table. A delegate keeps no state of its own (that lives in ref and the
  // caches above), so it can be reused, rather than built again for every row an include
  // resolves a relation for
  const delegates = new Map<string, any>()
  const Delegate = (prop: string, model: Prisma.DMMF.Model) => {
    let delegate = delegates.get(prop)
    if (!delegate) {
      delegate = createModelDelegate(prop, model)
      delegates.set(prop, delegate)
    }
    return delegate
  }

  return Delegate
} 