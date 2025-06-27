import { Prisma } from "@prisma/client";

import { PrismaMockData } from "../types";

import autoincrement, { reset as ResetAutoInc } from "./autoincrement";
import Cuid, { ResetCuid } from "./cuid";
import Now from "./now";
import Uuid, { ResetUuid } from "./uuid"

type FieldDefault = Prisma.DMMF.FieldDefault;

// const registry = new Map<string, (string, Prisma.DMMF.Field, PrismaMockData) => any>();
const registry = new Map();
registry.set("autoincrement", autoincrement);
registry.set("cuid", Cuid);
registry.set("uuid", Uuid);
registry.set("now", Now);

export default function HandleDefault<P>(
  prop: string,
  field: Prisma.DMMF.Field,
  ref: { data: PrismaMockData<P> }
): any {
  const key = (field.default as FieldDefault).name;
  const val = registry.get(key)?.(prop, field, ref.data);
  return val;
}

export function ResetDefaults() {
  ResetAutoInc();
  ResetCuid()
  ResetUuid()
}
