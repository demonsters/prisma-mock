import { Prisma } from "@prisma/client";

import { PrismaMockData } from "../types";

import createAutoincrement from "./autoincrement";
import createCuid from "./cuid";
import createNow from "./now";
import createUuid from "./uuid"

type FieldDefault = Prisma.DMMF.FieldDefault;

export default function createHandleDefault() {

  // const registry = new Map<string, (string, Prisma.DMMF.Field, PrismaMockData) => any>();
  const registry = new Map();
  registry.set("autoincrement", createAutoincrement());
  registry.set("cuid", createCuid());
  registry.set("uuid", createUuid());
  registry.set("now", createNow);

  return <P>(
    prop: string,
    field: Prisma.DMMF.Field,
    ref: { data: PrismaMockData<P> }
  ): any => {
    const key = (field.default as FieldDefault).name;
    const val = registry.get(key)?.(prop, field, ref.data);
    return val;
  }

}
