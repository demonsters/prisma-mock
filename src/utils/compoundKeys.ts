import type { Prisma } from "@prisma/client"

export type CompoundKey = {
  // The key used to look the constraint up in a where clause
  name: string
  fields: readonly string[]
}

// Prisma uses the custom `name` of a @@id / @@unique when one is set,
// otherwise the fields joined with "_" (e.g. `userId_answerId`)
const toCompoundKey = (name: string | null | undefined, fields: readonly string[]): CompoundKey => ({
  name: name ?? fields.join("_"),
  fields,
})

/**
 * Returns the multi-field @@id of a model, or null when it has none
 */
export const getCompoundIdKey = (model: Prisma.DMMF.Model): CompoundKey | null => {
  // @ts-ignore Backwards compatibility
  const fields: readonly string[] | undefined = model.idFields || model.primaryKey?.fields
  if (!fields || fields.length <= 1) {
    return null
  }
  return toCompoundKey(model.primaryKey?.name, fields)
}

/**
 * Returns the multi-field @@unique constraints of a model
 */
export const getCompoundUniqueKeys = (model: Prisma.DMMF.Model): CompoundKey[] => {
  // Older or hand-written DMMF may only have `uniqueFields`, which has no names
  const uniques: readonly { name: string | null, fields: readonly string[] }[] = model.uniqueIndexes
    ?? model.uniqueFields?.map((fields) => ({ name: null, fields }))
    ?? []
  return uniques
    .filter((unique) => unique.fields.length > 1)
    .map((unique) => toCompoundKey(unique.name, unique.fields))
}

/**
 * Returns all multi-field @@id and @@unique constraints of a model
 */
export const getCompoundKeys = (model: Prisma.DMMF.Model): CompoundKey[] => {
  const idKey = getCompoundIdKey(model)
  return [
    ...(idKey ? [idKey] : []),
    ...getCompoundUniqueKeys(model),
  ]
}

/**
 * Returns the keys a WhereUniqueInput selects a row by: the @id and @unique fields, the
 * fields of a single-field @@id / @@unique, and the names of the compound ones
 */
export const getUniqueKeyNames = (model: Prisma.DMMF.Model): string[] => {
  // @ts-ignore Backwards compatibility
  const idFields: readonly string[] = model.idFields || model.primaryKey?.fields || []
  const uniques: readonly { fields: readonly string[] }[] = model.uniqueIndexes
    ?? model.uniqueFields?.map((fields) => ({ fields }))
    ?? []
  return [...new Set([
    ...model.fields.filter((field) => field.isId || field.isUnique).map((field) => field.name),
    ...(idFields.length === 1 ? idFields : []),
    ...uniques.filter((unique) => unique.fields.length === 1).map((unique) => unique.fields[0]),
    ...getCompoundKeys(model).map((compoundKey) => compoundKey.name),
  ])]
}
