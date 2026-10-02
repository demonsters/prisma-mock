import type { Prisma } from "@prisma/client";
import { getCompoundIdKey } from "./compoundKeys";


export default function getWhereOnIds(model: Prisma.DMMF.Model, item: any) {
  let where = {}
  const fields = model.primaryKey?.fields
  if (!fields || fields.length === 0) {
    for (const field of model.fields) {
      if (field.isId) {
        where[field.name] = item[field.name]
      }
    }
  } else if (fields.length > 1) {
    for (const field of fields) {
      where[field] = item[field]
    }
    where = {
      [getCompoundIdKey(model).name]: where
    }
  }
  return where
}