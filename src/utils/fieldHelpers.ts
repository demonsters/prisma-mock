import type { Prisma } from "@prisma/client"
import { Item } from "../types"

export function isFieldDefault(
  f:
    | Prisma.DMMF.FieldDefault
    | readonly Prisma.DMMF.FieldDefaultScalar[]
    | Prisma.DMMF.FieldDefaultScalar
): f is Prisma.DMMF.FieldDefault {
  return (f as Prisma.DMMF.FieldDefault).name !== undefined
}

export function isDefinedWithValue<T extends object>(v: T, key: string): boolean {
  return v[key] !== undefined
}

export const getCamelCase = (name: any) => {
  return name.substr(0, 1).toLowerCase() + name.substr(1)
}

export const removeMultiFieldIds = (
  model: Prisma.DMMF.Model,
  data: any
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
      if (uniqueField.length > 1) {
        removeId(uniqueField)
      }
    }
  }
  return data
}

export const createGetFieldRelationshipWhere = (datamodel: Omit<Prisma.DMMF.Datamodel, 'indexes'>, manyToManyData: { [relationName: string]: Array<{ [type: string]: Item }> }) =>
  (item: any, field: Prisma.DMMF.Field, model: Prisma.DMMF.Model) => {
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
