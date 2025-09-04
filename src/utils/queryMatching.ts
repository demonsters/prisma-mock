import { Prisma } from "@prisma/client"
import { deepEqual } from "./deepEqual"
import { shallowCompare } from "./shallowCompare"
import getNestedValue from "./getNestedValue"
import { createGetFieldRelationshipWhere, getCamelCase, isDefinedWithValue } from "./fieldHelpers"
import { Where, Item } from "../types"


type Props = {
  getFieldRelationshipWhere: ReturnType<typeof createGetFieldRelationshipWhere>
  getDelegateForFieldName: (field: Prisma.DMMF.Field["type"]) => any
  model: Prisma.DMMF.Model
  datamodel: Omit<Prisma.DMMF.Datamodel, 'indexes'>
  caseInsensitive: boolean
}

export default function createMatch({ getFieldRelationshipWhere, getDelegateForFieldName, model, datamodel, caseInsensitive }: Props) {

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
          const delegate = getDelegateForFieldName(childName)
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
            // const all = data[childName].filter(
            //   matchFnc(getFieldRelationshipWhere(item, info)),
            // )
            const where = getFieldRelationshipWhere(item, info, model)
            if (!where) return false
            const all = delegate.findMany({
              where,
            })
            // For "every": all related records must match the condition
            // If no related records exist, "every" is vacuously true
            if (all.length === 0) return true
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

  return matchFnc
}