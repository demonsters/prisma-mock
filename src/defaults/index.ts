import { Prisma } from "@prisma/client";

import { PrismaMockData } from "..";

import autoincrement, { reset as ResetAutoInc } from "./autoincrement";
import Cuid, { ResetCuid } from "./cuid";
import { v4 as uuid } from "uuid";
import Now from "./now";

type FieldDefault = Prisma.DMMF.FieldDefault;

// const registry = new Map<string, (string, Prisma.DMMF.Field, PrismaMockData) => any>();
const registry = new Map();
registry.set("autoincrement", autoincrement);
registry.set("cuid", Cuid);
registry.set("now", Now);

import("uuid").then((uuid) => {
  registry.set("uuid", () => uuid.v4());
}).catch(() => {
})

export default function HandleDefault<P>(
  prop: string,
  field: Prisma.DMMF.Field,
  data: PrismaMockData<P>
): any {
  const key = (field.default as FieldDefault).name;
  const val = registry.get(key)?.(prop, field, data);
  return val;
}

export function ResetDefaults() {
  ResetAutoInc();
  ResetCuid()
}
