import { Prisma } from "@prisma/client"
import HandleDefault, { ResetDefaults } from "./defaults"
import { shallowCompare } from "./utils/shallowCompare"
import { deepEqual } from "./utils/deepEqual"
import { deepCopy } from "./utils/deepCopy"
import getNestedValue from "./utils/getNestedValue"
import createIndexes from "./indexes"

type DeepMockApi = {
  mockImplementation: (fnc: any) => void
}

type UnwrapPromise<P extends any> = P extends Promise<infer R> ? R : P

type PrismaDelegate = {
  findUnique: (...args: Array<any>) => Promise<any>
}

type IsTable<S> = S extends `\$${infer fnc}` ? never : S
type IsString<S extends any> = S extends string ? S : never

type PrismaList<
  P extends { [key: string]: any },
  K extends string
> = P[K] extends PrismaDelegate
  ? Array<Partial<UnwrapPromise<ReturnType<P[K]["findUnique"]>>>>
  : never

export type PrismaMockData<P> = Partial<{
  [key in IsTable<Uncapitalize<IsString<keyof P>>>]: PrismaList<P, key>
}>

type Where = any
type Item = any
type Args = any
type CreateArgs = any

function IsFieldDefault(
  f:
    | Prisma.DMMF.FieldDefault
    | readonly Prisma.DMMF.FieldDefaultScalar[]
    | Prisma.DMMF.FieldDefaultScalar
): f is Prisma.DMMF.FieldDefault {
  return (f as Prisma.DMMF.FieldDefault).name !== undefined
}

function isDefinedWithValue<T extends object>(v: T, key: string): boolean {
  return v[key] !== undefined
}

const throwPrismaError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}, errorClass: any = Prisma.PrismaClientKnownRequestError) => {
  const clientVersion = Prisma.prismaVersion.client
  // PrismaClientKnownRequestError prototype changed in version 4.7.0
  // from: constructor(message: string, code: string, clientVersion: string, meta?: any)
  // to: constructor(message: string, { code, clientVersion, meta, batchRequestIdx }: KnownErrorParams)
  let error
  if (errorClass.length === 2) {
    // @ts-ignore
    error = new errorClass(message, {
      code,
      clientVersion,
    })
  } else {
    // @ts-ignore
    error = new errorClass(
      message,
      // @ts-ignore
      code,
      // @ts-ignore
      clientVersion
    )
  }
  error.meta = meta
  throw error
}

const throwKnownError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}) => {
  throwPrismaError(message, { code, meta }, Prisma.PrismaClientKnownRequestError)
}

const throwValidationError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}) => {
  throwPrismaError(message, { code, meta }, Prisma.PrismaClientValidationError)
}

export type MockPrismaOptions = {
  caseInsensitive?: boolean
  // datamodel?: Prisma.DMMF.Datamodel
  // data?: any
}

const createPrismaMock = <P>(
  data: PrismaMockData<P> = {},
  datamodel = Prisma.dmmf.datamodel,
  mockClient: DeepMockApi,
  options: MockPrismaOptions = {
    caseInsensitive: false,
  }
): P & {
  $getInternalState: () => Required<PrismaMockData<P>>
} => {

  let client = mockClient ? mockClient : {}

  const mockImplementation = (name: string, fnc: any) => {
    if (mockClient) {
      client[name].mockImplementation(fnc)
    } else {
      client[name] = fnc
    }
  }

  const manyToManyData: { [relationName: string]: Array<{ [type: string]: Item }> } = {}

  const indexes = createIndexes()

  // let data = options.data || {}
  // const datamodel = options.datamodel || Prisma.dmmf.datamodel
  const caseInsensitive = options.caseInsensitive || false

  // let client = {} as P

  ResetDefaults()

  const getCamelCase = (name: any) => {
    return name.substr(0, 1).toLowerCase() + name.substr(1)
  }

  const removeMultiFieldIds = (
    model: Prisma.DMMF.Model,
    data: PrismaMockData<P>
  ) => {


    /// [tableName][field][value] = Array

    const c = getCamelCase(model.name)
    // @ts-ignore
    const idFields = model.idFields || model.primaryKey?.fields

    const removeId = (ids: readonly string[]) => {
      const id = ids.join("_")
      data = {
        ...data,
        [c]: data[c].map((item) => {
          const { [id]: idVal, ...rest } = item
          return {
            ...rest,
            ...idVal,
          }
        }),
      }
    }

    if (idFields?.length > 1) {
      removeId(idFields)
    }

    if (model.uniqueFields?.length > 0) {
      for (const uniqueField of model.uniqueFields) {
        removeId(uniqueField)
      }
    }
    return data
  }

  const getFieldRelationshipWhere = (item: any, field: Prisma.DMMF.Field, model: Prisma.DMMF.Model) => {
    if (field.relationFromFields.length === 0) {
      const joinmodel = datamodel.models.find((model) => {
        return model.name === field.type
      })
      const otherfield = joinmodel?.fields.find((f) => {
        return f.relationName === field.relationName
      })
      // Many-to-many
      if (otherfield?.relationFromFields.length === 0) {
        const idField = model?.fields.find((f) => f.isId)?.name
        const otherIdField = joinmodel?.fields.find((f) => f.isId)
        const items = manyToManyData[field.relationName]
          ?.filter(
            subitem => subitem[otherfield.type]?.[idField] === item[idField]
          )
        if (!items?.length) {
          return null
        }
        return {
          [otherIdField.name]: { in: items.map(subitem => (subitem[field.type][otherIdField.name])) }
        }
      }
      return {
        [otherfield.relationFromFields[0]]: item[otherfield.relationToFields[0]],
      }
    }
    return {
      [field.relationToFields[0]]: item[field.relationFromFields[0]],
    }
  }

  const getJoinField = (field: Prisma.DMMF.Field) => {
    const joinmodel = datamodel.models.find((model) => {
      return model.name === field.type
    })

    const joinfield = joinmodel?.fields.find((f) => {
      return f.relationName === field.relationName
    })
    return joinfield
  }

  mockImplementation("$transaction", async (actions: Promise<any>[] | ((prisma: P) => Promise<any>)) => {
    const res = []
    if (Array.isArray(actions)) {
      for (const action of actions) {
        res.push(await action)
      }
      return res
    } else {
      const snapshot = deepCopy(data)
      try {
        // @ts-ignore
        return await actions(client)
      }
      catch (error) {
        data = snapshot
        throw error
      }
    }
  })

  mockImplementation("$connect", async () => { })
  mockImplementation("$disconnect", async () => { })
  mockImplementation("$use", async () => {
    throw new Error("$use is not yet implemented in prisma-mock")
  })


  // client["$connect"] = async () => { }
  // client["$disconnect"] = async () => { }
  // client["$use"] = async () => { }

  const Delegate = (prop: string, model: Prisma.DMMF.Model) => {


    const sortFunc = (orderBy) => (a, b) => {
      if (Array.isArray(orderBy)) {
        for (const order of orderBy) {
          const res = sortFunc(order)(a, b)
          if (res !== 0) {
            return res
          }
        }
        return 0
      }
      const keys = Object.keys(orderBy)
      if (keys.length > 1) {
        throwValidationError(
          `Argument orderBy of needs exactly one argument, but you provided ${keys.join(
            " and "
          )}. Please choose one.`
        )
      }
      const incl = includes({
        include: keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
      })
      for (const key of keys) {
        const dir = orderBy[key]
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
          if (a[key] > b[key]) {
            return dir === "asc" ? 1 : -1
          } else if (a[key] < b[key]) {
            return dir === "asc" ? -1 : 1
          }
        }
      }
      return 0
    }

    const nestedUpdate = (args, isCreating: boolean, item: any) => {
      let inputData = args.data
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

          if (isCreating && (field.isUnique || field.isId)) {
            const existing = findOne({ where: { [field.name]: inputFieldData } })
            if (existing) {
              throwKnownError(
                `Unique constraint failed on the fields: (\`${field.name}\`)`,
                { code: 'P2002', meta: { target: [field.name] } },
              )
            }
          }

          if (field.kind === "object") {
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
                    let matchingRow = data[getCamelCase(field.type)].find(
                      (row) => {
                        return row[keyToMatch] === valueToMatch
                      }
                    )
                    if (!matchingRow) {
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
                      matchingRow = data[getCamelCase(field.type)].find(
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
                const item = delegate.create({
                  data: inputFieldData.create,
                })
                inputData = {
                  ...rest,
                  [field.relationFromFields[0]]:
                    item[field.relationToFields[0]],
                }
              } else {
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

        if (
          (isCreating || inputData[field.name] === null) &&
          (inputData[field.name] === null || inputData[field.name] === undefined)
        ) {
          if (field.hasDefaultValue) {
            if (IsFieldDefault(field.default)) {
              const defaultValue = HandleDefault(prop, field, data)
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
      return inputData
    }

    const matchItem = (child: any, item: any, where: any) => {
      let val = item[child]
      const filter = where[child]
      if (child === "OR") {
        return matchOr(item, filter)
      }
      if (child === "AND") {
        return matchAnd(item, filter)
      }
      if (child === "NOT") {
        return matchNot(item, filter)
      }

      if (filter == null || filter === undefined) {
        if (filter === null) {
          return val === null || val === undefined
        }
        return true
      }

      if (filter instanceof Date) {
        if (val === undefined) {
          return false
        }
        if (!(val instanceof Date) || val.getTime() !== filter.getTime()) {
          return false
        }
      } else {
        if (typeof filter === "object") {
          const info = model.fields.find((field) => field.name === child)
          if (info?.relationName) {
            const childName = getCamelCase(info.type)
            let childWhere = {}
            if (filter.every) {
              childWhere = filter.every
            } else if (filter.some) {
              childWhere = filter.some
            } else if (filter.none) {
              childWhere = filter.none
            } else {
              childWhere = filter
            }
            const submodel = datamodel.models.find((model) => {
              return getCamelCase(model.name) === childName
            })
            const delegate = Delegate(getCamelCase(childName), submodel)
            const joinWhere = getFieldRelationshipWhere(item, info, submodel)
            if (!joinWhere) {
              return false
            }
            // return true
            const res = delegate.findMany({
              where: {
                AND: [
                  childWhere,
                  joinWhere
                ]
              }
            })
            if (filter.every) {
              if (res.length === 0) return true
              // const all = data[childName].filter(
              //   matchFnc(getFieldRelationshipWhere(item, info)),
              // )
              const where = getFieldRelationshipWhere(item, info, model)
              if (!where) return false
              const all = delegate.findMany({
                where,
              })
              return res.length === all.length
            } else if (filter.some) {
              return res.length > 0
            } else if (filter.none) {
              return res.length === 0
            }
            return res.length > 0
          }
          // @ts-ignore Backwards compatibility
          const idFields = model.idFields || model.primaryKey?.fields
          if (idFields?.length > 1) {
            if (child === idFields.join("_")) {
              return shallowCompare(item, filter)
            }
          }

          if (model.uniqueFields?.length > 0) {
            for (const uniqueField of model.uniqueFields) {
              if (child === uniqueField.join("_")) {
                return shallowCompare(item, filter)
              }
            }
          }
          if (val === undefined) {
            return false
          }
          if (val === null) {
            return false
          }
          let match = true
          const matchFilter = { ...filter }
          if (
            caseInsensitive ||
            ("mode" in matchFilter && matchFilter.mode === "insensitive")
          ) {
            val = val.toLowerCase ? val.toLowerCase() : val
            Object.keys(matchFilter).forEach((key) => {
              const value = matchFilter[key]
              if (value.toLowerCase) {
                matchFilter[key] = value.toLowerCase()
              } else if (value instanceof Array) {
                matchFilter[key] = value.map((v) =>
                  v.toLowerCase ? v.toLowerCase() : v
                )
              }
            })
          }
          if ("path" in matchFilter) {
            val = getNestedValue(matchFilter.path, val)
          }
          if ("equals" in matchFilter && match) {
            // match = deepEqual(matchFilter.equals, val)
            if (matchFilter.equals === Prisma.DbNull) {
              if (val === Prisma.DbNull) {
              }
              match = val === Prisma.DbNull
            } else if (matchFilter.equals === Prisma.AnyNull) {
              match = val === Prisma.DbNull || val === Prisma.JsonNull
            } else {
              if (val === Prisma.DbNull) {
                match = false
              } else {
                match = deepEqual(matchFilter.equals, val)
              }
            }
          }
          if ("startsWith" in matchFilter && match) {
            match = val.indexOf(matchFilter.startsWith) === 0
          }
          if ("string_starts_with" in matchFilter && match) {
            match = val?.indexOf(matchFilter.string_starts_with) === 0
          }
          if ("array_contains" in matchFilter && match) {
            if (Array.isArray(val)) {
              for (const item of matchFilter.array_contains) {
                let hasMatch = false
                for (const i of val) {
                  if (deepEqual(item, i)) hasMatch = true
                }
                if (!hasMatch) {
                  match = false
                  break
                }
              }
            } else {
              match = false
            }
          }
          if ("string_ends_with" in matchFilter && match) {
            match = val ? val.lastIndexOf(matchFilter.string_ends_with) === val.length - matchFilter.string_ends_with.length : false
          }
          if ("string_contains" in matchFilter && match) {
            match = val ? val?.indexOf(matchFilter.string_contains) !== -1 : false
          }
          if ("endsWith" in matchFilter && match) {
            match =
              val.lastIndexOf(matchFilter.endsWith) ===
              val.length - matchFilter.endsWith.length
          }
          if ("contains" in matchFilter && match) {
            match = val.indexOf(matchFilter.contains) > -1
          }
          if (isDefinedWithValue(matchFilter, "gt") && match) {
            match = val > matchFilter.gt
          }
          if (isDefinedWithValue(matchFilter, "gte") && match) {
            match = val >= matchFilter.gte
          }
          if (isDefinedWithValue(matchFilter, "lt") && match) {
            match = val < matchFilter.lt
          }
          if (isDefinedWithValue(matchFilter, "lte") && match) {
            match = val <= matchFilter.lte
          }
          if ("in" in matchFilter && match) {
            match = matchFilter.in.includes(val)
          }
          if ("not" in matchFilter && match) {
            if (matchFilter.not === Prisma.DbNull) {
              match = val !== Prisma.DbNull
            } else {
              if (val === Prisma.DbNull) {
                match = false
              } else {
                match = !deepEqual(matchFilter.not, val)
              }
            }
          }
          if ("notIn" in matchFilter && match) {
            match = !matchFilter.notIn.includes(val)
          }
          if (!match) {
            return false
          }
        } else if (val !== filter) {
          return false
        }
      }
      return true
    }

    const matchItems = (item: string, where: Where) => {
      for (let child in where) {
        if (!matchItem(child, item, where)) {
          return false
        }
      }
      return true
    }

    const matchNot = (item: string, where: Where) => {
      if (Array.isArray(where)) {
        let hasNull = false
        let res = !where.some((w: Where) => {
          for (let child in w) {
            if (item[child] === null) {
              hasNull = true
              return false
            }
            if (matchItem(child, item, w)) {
              return true
            }
          }
          return false
        })
        return hasNull ? caseInsensitive : res
      }
      for (let child in where) {
        if (item[child] === null) {
          return false
        }
        if (!matchItem(child, item, where)) {
          return true
        }
      }
      return false
    }

    const matchAnd = (item: any, where: Where) => {
      return where.filter((child: Where) => matchItems(item, child)).length === where.length
    }

    const matchOr = (item: any, where: Where) => {
      return where.some((child: Where) => matchItems(item, child))
    }

    const matchFnc = (where: Where) => (item: any) => {
      if (where) {
        return matchItems(item, where)
      }
      return true
    }

    const findOne = (args: any) => {
      if (!data[prop]) return null
      const items = findMany(args)
      if (items.length === 0) {
        return null
      }
      return items[0]
    }

    const findOrThrow = (args) => {
      const found = findOne(args)
      if (!found) {
        throwKnownError(`No ${prop.slice(0, 1).toUpperCase()}${prop.slice(1)} found`)
      }
      return found
    }

    const findMany = (args) => {

      const match = matchFnc(args?.where)
      const inc = includes(args)

      // let res = data[prop]
      //   .filter(matchFnc(args?.where))
      //   .map(includes(args))

      let items = indexes.getIndexedItems(prop, args?.where) || data[prop]
      if (prop === 'userAnswers') {
        items //?
      }
      let res = []
      for (const item of items) {
        if (match(item)) {
          const i = inc(item)
          res.push(i)
        }
      }

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
      if (args?.orderBy) {
        res.sort(sortFunc(args?.orderBy))
      }
      if (args?.select) {
        res = res.map((item) => {
          const newItem = {}
          Object.keys(args.select).forEach((key) => (newItem[key] = item[key]))
          return newItem
        })
      }
      if (args?.cursor !== undefined) {
        const cursorVal = res.findIndex((r) =>
          Object.keys(args?.cursor).every((key) => r[key] === args?.cursor[key])
        )
        res = res.slice(cursorVal)
      }
      if (args?.skip !== undefined || args?.take !== undefined) {
        const start = args?.skip !== undefined ? args?.skip : 0
        const end = args?.take !== undefined ? start + args.take : undefined
        res = res.slice(start, end)
      }
      // Replace nulls
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

    const updateMany = (args) => {
      // if (!Array.isArray(data[prop])) {
      //   throw new Error(`${prop} not found in data`)
      // }
      let nbUpdated = 0
      const newItems = data[prop].map((e) => {
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
      data = {
        ...data,
        [prop]: newItems,
      }
      data = removeMultiFieldIds(model, data)
      return { data, nbUpdated }
    }

    const create = (args: CreateArgs) => {
      const d = nestedUpdate(args, true, null)

      data = {
        ...data,
        [prop]: [...data[prop], d],
      }
      data = removeMultiFieldIds(model, data)

      let where = {}
      for (const field of model.fields) {
        if (field.default) {
          where[field.name] = d[field.name]
        }
      }
      const item = findOne({ where, ...args })
      indexes.updateItem(prop, item, null)
      return item
    }

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
        },
        )
        .filter((item) => item !== null)
    }

    const deleteMany = (args) => {
      const model = datamodel.models.find((model) => {
        return getCamelCase(model.name) === prop
      })

      const deleted = []
      data = {
        ...data,
        [prop]: data[prop].filter((e) => {
          const shouldDelete = matchFnc(args?.where)(e)
          if (shouldDelete) {
            deleted.push(e)
          }
          return !shouldDelete
        }),
      }

      // Referential Actions
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
            // Add relation
            newItem = {
              ...newItem,
              [key]: delegate._findMany(subArgs),
            }
          } else {
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

    const update = (args) => {
      let updatedItem
      let hasMatch = false
      const match = matchFnc(args.where)
      const newItems = data[prop].map((e) => {
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
      data = {
        ...data,
        [prop]: newItems,
      }
      data = removeMultiFieldIds(model, data)
      return findOne({ ...args, where: updatedItem })
    }

    const notImplemented = (name: string) => () => {
      throw new Error(`${name} is not yet implemented in prisma-mock`)
    }

    return {
      aggregate: notImplemented("aggregate"),
      groupBy: notImplemented("groupBy"),
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

      count(args) {
        const res = findMany(args)
        return res.length
      },

      _sortFunc: sortFunc,
      _findMany: findMany,
      _createMany: createMany,
    }
  }

  datamodel.models.forEach((model) => {
    if (!model) return
    const c = getCamelCase(model.name)
    if (!data[c]) {
      data = {
        ...(data || {}),
        [c]: [],
      }
    }
    data = removeMultiFieldIds(model, data)

    model.fields.forEach((field) => {
      if (model.name === "UserAnswers") {
        model.primaryKey?.fields.includes(field.name)
      }
      indexes.addIndexFieldIfNeeded(c, field, !!model.primaryKey?.fields.includes(field.name))
    })

    data[c].forEach((item) => {
      indexes.updateItem(c, item, null)
    })

    const objs = Delegate(c, model)
    Object.keys(objs).forEach((fncName) => {
      if (fncName.indexOf("_") === 0) return
      if (!client[c]) client[c] = {}
      if (mockClient) {
        client[c][fncName].mockImplementation(async (...params) => {
          return objs[fncName](...params)
        })
      } else {
        client[c][fncName] = async (...params) => {
          return objs[fncName](...params)
        }
      }
    })
  })

  client['$getInternalState'] = () => data

  // @ts-ignore
  return client
}

export default createPrismaMock
