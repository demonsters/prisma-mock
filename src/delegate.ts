import { Prisma } from "@prisma/client"
import createHandleDefault from "./defaults"
import { throwKnownError, throwValidationError } from "./errors"
import createIndexes from "./indexes"
import { CreateArgs, Item } from "./types"
import { createGetFieldRelationshipWhere, getCamelCase, isFieldDefault, removeMultiFieldIds } from "./utils/fieldHelpers"
import createMatch from "./utils/queryMatching"
import { shallowCompare } from "./utils/shallowCompare"

/**
 * Creates a delegate function that handles Prisma-like operations for a specific model
 * This is the main factory function that generates model-specific CRUD operations
 */
export const createDelegate = (
  ref: any, // Reference to the mock data store
  datamodel: Prisma.DMMF.Datamodel, // Prisma datamodel definition
  caseInsensitive: boolean, // Whether string comparisons should be case insensitive
  indexes: ReturnType<typeof createIndexes>, // Index management for performance
) => {

  // Initialize default value handler
  const handleDefaults = createHandleDefault()

  // Store many-to-many relationship data separately from the main data store
  const manyToManyData: { [relationName: string]: Array<{ [type: string]: Item }> } = {}

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
  const Delegate = (prop: string, model: Prisma.DMMF.Model) => {

    // Create matching function for WHERE clauses
    const matchFnc = createMatch({ getFieldRelationshipWhere, Delegate, model, datamodel, caseInsensitive })

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
        throwValidationError(
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
          const submodel = datamodel.models.find((model) => {
            return model.name === schema.type
          })
          const delegate = Delegate(getCamelCase(schema.type), submodel)
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
            const existing = findOne({ where: { [field.name]: inputFieldData } })
            if (existing) {
              throwKnownError(
                `Unique constraint failed on the fields: (\`${field.name}\`)`,
                { code: 'P2002', meta: { target: [field.name] } },
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
              const delegate = Delegate(getCamelCase(field.type), otherModel)
              const items = inputFieldData.set.map(where => delegate.findUnique({
                where
              })).filter(Boolean)

              if (items.length !== inputFieldData.set.length) {
                throwKnownError(`An operation failed because it depends on one or more records that were required but not found. Expected ${inputFieldData.set.length} records to be connected, found only ${items.length}.`)
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
                if (keyToGet && targetKey) {
                  let connectionValue = connect[keyToGet]
                  if (keyToMatch !== keyToGet) {
                    const valueToMatch = connect[keyToMatch]
                    let matchingRow = ref.data[getCamelCase(field.type)].find(
                      (row) => {
                        return row[keyToMatch] === valueToMatch
                      }
                    )
                    if (!matchingRow) {
                      // Try to find by unique index if direct match fails
                      const refModel = datamodel.models.find(
                        (model) =>
                          getCamelCase(field.type) === getCamelCase(model.name)
                      )
                      const uniqueIndexes = refModel.uniqueIndexes.map(
                        (index) => {
                          return {
                            ...index,
                            key: index.name ?? index.fields.join("_"),
                          }
                        }
                      )
                      const indexKey = uniqueIndexes.find(
                        (index) => index.key === keyToMatch
                      )
                      matchingRow = ref.data[getCamelCase(field.type)].find(
                        (row) => {
                          const target = Object.fromEntries(
                            Object.entries(row).filter(
                              (row) =>
                                indexKey?.fields.includes(row[0]) ?? false
                            )
                          )
                          return shallowCompare(target, valueToMatch)
                        }
                      )
                      if (!matchingRow) {
                        throwKnownError(
                          "An operation failed because it depends on one or more records that were required but not found. {cause}"
                        )
                      }
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
                  const otherModel = datamodel.models.find((model) => {
                    return model.name === field.type
                  })
                  const otherField = otherModel.fields.find(
                    (otherField) =>
                      field.relationName === otherField.relationName
                  )

                  const delegate = Delegate(
                    getCamelCase(otherModel.name),
                    otherModel
                  )

                  const otherTargetKey = otherField.relationToFields[0]
                  if ((!targetKey && !keyToGet) && otherTargetKey) {
                    delegate.update({
                      where: connect,
                      data: {
                        [getCamelCase(otherField.name)]: {
                          connect: {
                            [otherTargetKey]: inputData[otherTargetKey],
                          },
                        },
                      }
                    })
                  } else {
                    const a = manyToManyData[field.relationName] = manyToManyData[field.relationName] || []
                    a.push({
                      [field.type]: delegate.findOne({
                        where: connect
                      }),
                      [otherField.type]: item || inputData
                    })
                  }
                }
              })
            }

            // Handle upsert operation
            if (inputFieldData.upsert) {
              const args = inputFieldData.upsert

              const name = getCamelCase(field.type)
              const delegate = Delegate(name, model)
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

              const otherModel = datamodel.models.find((model) => {
                return model.name === field.type
              })

              const { [field.name]: _create, ...rest } = inputData
              inputData = rest
              // @ts-ignore
              const name = getCamelCase(field.type)
              const delegate = Delegate(name, otherModel)

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
            const delegate = Delegate(name, model)
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
                if (field.relationFromFields.length > 0) {
                  const where = getFieldRelationshipWhere(item, field, model)
                  const data = inputFieldData.update
                  if (where) {
                    delegate.update({
                      data: inputFieldData.update,
                      where,
                    })
                  }
                } else {
                  const where = getFieldRelationshipWhere(item, field, model) //?
                  // TODO: 
                  inputFieldData.update.where //?
                  delegate.update({
                    data: inputFieldData.update.data,
                    where,
                  })
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
    const findOne = (args: any) => {
      if (!ref.data[prop]) return null
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
        throwKnownError(`No ${prop.slice(0, 1).toUpperCase()}${prop.slice(1)} found`)
      }
      return found
    }

    /**
     * Finds multiple records matching the given criteria
     * Handles filtering, sorting, pagination, and includes
     */
    const findMany = (args) => {
      const match = matchFnc(args?.where)
      const inc = includes(args)
      let items = indexes.getIndexedItems(prop, args?.where) || ref.data[prop] || []

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
        const cursorVal = res.findIndex((r) => Object.keys(args?.cursor).every((key) => r[key] === args?.cursor[key])
        )
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
          if (item[key] === Prisma.JsonNull || item[key] === Prisma.DbNull) {
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
      const newItems = ref.data[prop].map((e) => {
        if (matchFnc(args.where)(e)) {
          let data = nestedUpdate(args, false, e)
          nbUpdated++
          const newItem = {
            ...e,
            ...data,
          }
          indexes.updateItem(prop, newItem, e)
          return newItem
        }
        return e
      })
      ref.data = {
        ...ref.data,
        [prop]: newItems,
      }
      ref.data = removeMultiFieldIds(model, ref.data)
      return { data: ref.data, nbUpdated }
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
      ref.data = {
        ...ref.data,
        [prop]: [...ref.data[prop] || [], d],
      }
      ref.data = removeMultiFieldIds(model, ref.data)

      // Create where clause from unique identifier fields for index update
      let where = {}
      const fields = model.primaryKey?.fields
      if (!fields || fields.length === 0) {
        for (const field of model.fields) {
          if (field.isId) {
            where[field.name] = d[field.name]
          }
        }
      } else if (fields.length > 1) {
        for (const field of fields) {
          where[field] = d[field]
        }
        where = {
          [fields.join("_")]: where
        }
      }
      const item = findOne({ where, ...args })
      indexes.updateItem(prop, item, null)
      return item
    }

    /**
     * Creates multiple records with the given data
     * Supports skipDuplicates option to handle unique constraint violations
     */
    const createMany = (args) => {
      const skipDuplicates = args.skipDuplicates ?? false
      return (Array.isArray(args.data) ? args.data : [args.data])
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
      ref.data = {
        ...ref.data,
        [prop]: ref.data[prop].filter((e) => {
          const shouldDelete = matchFnc(args?.where)(e)
          if (shouldDelete) {
            deleted.push(e)
          }
          return !shouldDelete
        }),
      }

      // Handle referential actions for deleted records
      deleted.forEach((item) => {

        model.fields.forEach((field) => {

          indexes.deleteItemByField(prop, field, item)

          const joinfield = getJoinField(field)
          if (!joinfield) return
          const delegate = Delegate(getCamelCase(field.type), model)
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
            const submodel = datamodel.models.find((model) => {
              return model.name === schema.type
            })

            // Get delegate for relation
            const delegate = Delegate(getCamelCase(schema.type), submodel)
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
      let hasMatch = false
      const match = matchFnc(args.where)
      const newItems = ref.data[prop]?.map((e) => {
        if (match(e)) {
          hasMatch = true
          let data = nestedUpdate(args, false, e)
          updatedItem = {
            ...e,
            ...data,
          }
          indexes.updateItem(prop, updatedItem, e)
          return updatedItem
        }
        return e
      })
      if (!hasMatch) {
        if (args.skipForeignKeysChecks) return
        throwKnownError(
          "An operation failed because it depends on one or more records that were required but not found. Record to update not found.",
          { meta: { cause: "Record to update not found." } }
        )
      }
      ref.data = {
        ...ref.data,
        [prop]: newItems,
      }
      ref.data = removeMultiFieldIds(model, ref.data)
      return findOne({ ...args, where: updatedItem })
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
      delete: (args) => {
        const item = findOne(args)
        if (!item) {
          throwKnownError(
            "An operation failed because it depends on one or more records that were required but not found. Record to delete does not exist.",
            { meta: { cause: "Record to delete does not exist." } }
          )
        }
        const deleted = deleteMany(args)
        if (deleted.length) {
          return deleted[0]
        }
        return null
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
        const res = findMany(args)
        return res.length
      },

      // Internal methods
      _sortFunc: sortFunc,
      _findMany: findMany,
      _createMany: createMany,
    }
  }
  return Delegate
} 