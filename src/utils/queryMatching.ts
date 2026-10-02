import type { Prisma } from "@prisma/client"
import { deepEqual } from "./deepEqual"
import { shallowCompare } from "./shallowCompare"
import getNestedValue from "./getNestedValue"
import {
  createGetFieldRelationshipWhere,
  getCamelCase,
  isDefinedWithValue,
} from "./fieldHelpers"
import { getCompoundKeys } from "./compoundKeys"
import { Where, Item } from "../types"

type Props = {
  getFieldRelationshipWhere: ReturnType<typeof createGetFieldRelationshipWhere>
  getDelegateForFieldName: (field: Prisma.DMMF.Field["type"]) => any
  model: Prisma.DMMF.Model
  datamodel: Omit<Prisma.DMMF.Datamodel, "indexes">
  caseInsensitive: boolean
  prisma: typeof Prisma
  ref: { data: any }
}

/**
 * The rows of a related model that match the constant (row independent) part of a
 * relation filter, plus lazily built lookup tables on the fields used to join them
 * back to the rows being matched.
 */
type RelatedRows = {
  items: any[]
  byField: Map<string, Map<any, any[]>>
}

/**
 * State shared by every row matched by a single matcher, so that the part of a
 * relation filter which does not depend on the row is only evaluated once.
 */
type MatchContext = {
  version: any
  related: Map<any, Map<string, RelatedRows>>
}

// Cache key used for "all rows of the related model" (no constant filter part)
const ALL_ROWS = {}

/**
 * Describes how a join clause (as returned by getFieldRelationshipWhere) can be
 * answered from a lookup table instead of a full scan. Returns null for the shapes
 * that need the generic matcher.
 */
const getJoinPlan = (joinWhere: any) => {
  const keys = Object.keys(joinWhere)
  if (keys.length !== 1) return null
  const field = keys[0]
  const value = joinWhere[field]
  if (value === undefined)
    return { field, kind: "all" as const, value, values: null }
  if (value === null)
    return { field, kind: "null" as const, value, values: null }
  if (value instanceof Date) return null
  if (typeof value === "object") {
    const subKeys = Object.keys(value)
    if (
      subKeys.length === 1 &&
      subKeys[0] === "in" &&
      Array.isArray(value.in)
    ) {
      if (value.in.some(isUnhashable)) return null
      return { field, kind: "in" as const, value, values: value.in }
    }
    return null
  }
  if (isUnhashable(value)) return null
  return { field, kind: "equals" as const, value, values: null }
}

// Map lookups use SameValueZero, which considers NaN equal to itself, while the
// matcher uses !==. Values like that fall back to the generic matcher.
const isUnhashable = (value: any) =>
  typeof value === "number" && Number.isNaN(value)

export default function createMatch({
  prisma,
  getFieldRelationshipWhere,
  getDelegateForFieldName,
  model,
  datamodel,
  caseInsensitive,
  ref,
}: Props) {
  // Multi-field @@id / @@unique keys, matched by their where key (e.g. `userId_answerId`)
  const compoundKeys = model ? getCompoundKeys(model) : []

  /**
   * Returns the rows of the related model matching `childWhere`, evaluating it at
   * most once per matcher. `childWhere` is the part of a relation filter that is
   * identical for every row being matched, so it is keyed by identity.
   */
  const getRelatedRows = (
    ctx: MatchContext,
    childName: string,
    delegate: any,
    childWhere: any | null
  ): RelatedRows => {
    const build = () => ({
      items: childWhere
        ? delegate.findMany({ where: childWhere })
        : delegate.findMany({}),
      byField: new Map(),
    })
    if (!ctx) return build()
    // Any write replaces ref.data, which invalidates everything collected so far
    if (ctx.version !== ref?.data) {
      ctx.related.clear()
      ctx.version = ref?.data
    }
    const key = childWhere || ALL_ROWS
    let byModel = ctx.related.get(key)
    if (!byModel) {
      byModel = new Map()
      ctx.related.set(key, byModel)
    }
    let rows = byModel.get(childName)
    if (!rows) {
      rows = build()
      byModel.set(childName, rows)
    }
    return rows
  }

  /**
   * Groups the related rows by the value of a join field, so that linking them to a
   * row being matched is a lookup instead of a scan.
   */
  const getLookup = (rows: RelatedRows, field: string) => {
    let lookup = rows.byField.get(field)
    if (!lookup) {
      lookup = new Map()
      for (const item of rows.items) {
        const value = item[field]
        const list = lookup.get(value)
        if (list) {
          list.push(item)
        } else {
          lookup.set(value, [item])
        }
      }
      rows.byField.set(field, lookup)
    }
    return lookup
  }

  /**
   * Counts the related rows that are linked to the row being matched by `joinWhere`.
   * `fallback` performs the equivalent query for join clauses that cannot be answered
   * from a lookup table. When `firstOnly` is set the count saturates at 1.
   */
  const countLinked = (
    rows: RelatedRows,
    joinWhere: any,
    fallback: () => any[],
    firstOnly: boolean = false
  ) => {
    const plan = getJoinPlan(joinWhere)
    if (!plan) {
      return fallback().length
    }
    if (plan.kind === "all") {
      return firstOnly ? Math.min(rows.items.length, 1) : rows.items.length
    }
    const lookup = getLookup(rows, plan.field)
    if (plan.kind === "equals") {
      const list = lookup.get(plan.value)
      if (!list) return 0
      return firstOnly ? 1 : list.length
    }
    if (plan.kind === "null") {
      // A null filter also matches rows where the field is absent
      const count =
        (lookup.get(null)?.length || 0) + (lookup.get(undefined)?.length || 0)
      return firstOnly ? Math.min(count, 1) : count
    }
    let count = 0
    let seen: Set<any> = null
    for (const value of plan.values) {
      // The values of an `in` clause may repeat, a row must only be counted once
      if (seen?.has(value)) continue
      const list = lookup.get(value)
      if (!list) continue
      if (firstOnly) return 1
      count += list.length
      if (!seen) seen = new Set()
      seen.add(value)
    }
    return count
  }

  const hasLinked = (
    rows: RelatedRows,
    joinWhere: any,
    fallback: () => any[]
  ) => countLinked(rows, joinWhere, fallback, true) > 0

  const matchItem = (child: any, item: any, where: any, ctx?: MatchContext) => {
    let val = item[child]
    const filter = where[child]
    if (child === "OR") {
      return matchOr(item, filter, ctx)
    }
    if (child === "AND") {
      return matchAnd(item, filter, ctx)
    }
    if (child === "NOT") {
      return matchNot(item, filter, ctx)
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
          let useIsFilter = false
          let useIsNotFilter = false
          if (filter.every) {
            childWhere = filter.every
          } else if (filter.some) {
            childWhere = filter.some
          } else if (filter.none) {
            childWhere = filter.none
          } else if ("is" in filter) {
            useIsFilter = true
            childWhere = filter.is === null ? {} : filter.is
          } else if ("isNot" in filter) {
            useIsNotFilter = true
            childWhere = filter.isNot === null ? {} : filter.isNot
          } else {
            childWhere = filter
          }
          const submodel = datamodel.models.find((model) => {
            return getCamelCase(model.name) === childName
          })
          const delegate = getDelegateForFieldName(childName)
          const joinWhere = getFieldRelationshipWhere(item, info, submodel)

          if (useIsFilter) {
            if (filter.is === null) {
              if (!joinWhere) return true
              const rows = getRelatedRows(ctx, childName, delegate, null)
              return !hasLinked(rows, joinWhere, () =>
                delegate.findMany({ where: joinWhere })
              )
            }
            if (!joinWhere) return false
            const rows = getRelatedRows(ctx, childName, delegate, childWhere)
            return hasLinked(rows, joinWhere, () =>
              delegate.findMany({
                where: { AND: [childWhere, joinWhere] },
              })
            )
          }
          if (useIsNotFilter) {
            if (filter.isNot === null) {
              if (!joinWhere) return false
              const rows = getRelatedRows(ctx, childName, delegate, null)
              return hasLinked(rows, joinWhere, () =>
                delegate.findMany({ where: joinWhere })
              )
            }
            if (!joinWhere) return true
            const rows = getRelatedRows(ctx, childName, delegate, childWhere)
            return !hasLinked(rows, joinWhere, () =>
              delegate.findMany({
                where: { AND: [childWhere, joinWhere] },
              })
            )
          }

          if (!joinWhere) {
            return false
          }
          const rows = getRelatedRows(ctx, childName, delegate, childWhere)
          const matchFallback = () =>
            delegate.findMany({
              where: {
                AND: [childWhere, joinWhere],
              },
            })
          if (filter.every) {
            const where = getFieldRelationshipWhere(item, info, model)
            if (!where) return false
            const allRows = getRelatedRows(ctx, childName, delegate, null)
            const all = countLinked(allRows, where, () =>
              delegate.findMany({ where })
            )
            if (all === 0) return true
            return countLinked(rows, joinWhere, matchFallback) === all
          } else if (filter.none) {
            return !hasLinked(rows, joinWhere, matchFallback)
          }
          // `some` and the implicit to-one filter only need to know if anything matched
          return hasLinked(rows, joinWhere, matchFallback)
        }
        if (compoundKeys.some((key) => key.name === child)) {
          return shallowCompare(item, filter)
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
          if (matchFilter.equals === prisma.DbNull) {
            if (val === prisma.DbNull) {
            }
            match = val === prisma.DbNull
          } else if (matchFilter.equals === prisma.AnyNull) {
            match = val === prisma.DbNull || val === prisma.JsonNull
          } else {
            if (val === prisma.DbNull) {
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
          match = val
            ? val.lastIndexOf(matchFilter.string_ends_with) ===
              val.length - matchFilter.string_ends_with.length
            : false
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
          if (matchFilter.not === prisma.DbNull) {
            match = val !== prisma.DbNull
          } else {
            if (val === prisma.DbNull) {
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

  const matchItems = (item: string, where: Where, ctx?: MatchContext) => {
    for (let child in where) {
      if (!matchItem(child, item, where, ctx)) {
        return false
      }
    }
    return true
  }

  const matchNot = (item: string, where: Where, ctx?: MatchContext) => {
    if (Array.isArray(where)) {
      let hasNull = false
      let res = !where.some((w: Where) => {
        for (let child in w) {
          if (item[child] === null) {
            hasNull = true
            return false
          }
          if (matchItem(child, item, w, ctx)) {
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
      if (!matchItem(child, item, where, ctx)) {
        return true
      }
    }
    return false
  }

  const matchAnd = (item: any, where: Where, ctx?: MatchContext) => {
    return (
      where.filter((child: Where) => matchItems(item, child, ctx)).length ===
      where.length
    )
  }

  const matchOr = (item: any, where: Where, ctx?: MatchContext) => {
    return where.some((child: Where) => matchItems(item, child, ctx))
  }

  const matchFnc = (where: Where) => {
    // Shared by every row this matcher is applied to
    const ctx: MatchContext = { version: ref?.data, related: new Map() }
    return (item: any) => {
      if (where) {
        return matchItems(item, where, ctx)
      }
      return true
    }
  }

  return matchFnc
}
