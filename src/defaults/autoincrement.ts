import { Prisma } from "@prisma/client";
import { PrismaMockData } from "..";

let autoincrement_cache: { [key: string]: number } = {};

export default function autoincrement<P>(
  prop: string,
  field: Prisma.DMMF.Field,
  data: PrismaMockData<P> = {}
): Number {
  const key = `${prop}_${field.name}`;
  let m = autoincrement_cache?.[key];
  if (m === undefined) {
    m = 0;
    data[prop].forEach((item: { [x: string]: number }) => {
      m = Math.max(m, item[field.name]);
    });
  }
  m += 1;
  autoincrement_cache[key] = m;
  return m;
}

export function reset() {
  autoincrement_cache = {};
}
