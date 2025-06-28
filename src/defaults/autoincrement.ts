import { Prisma } from "@prisma/client";
import { PrismaMockData } from "../types";


export default function createAutoincrement() {

  let autoincrement_cache: { [key: string]: number | bigint } = {};
  return <P>(
    prop: string,
    field: Prisma.DMMF.Field,
    data: PrismaMockData<P> = {}
  ): Number | BigInt => {
    const key = `${prop}_${field.name}`;
    let m = autoincrement_cache?.[key];
    if (field.type === 'BigInt') {
      if (m === undefined) {
        m = 0n;
        data[prop].forEach((item: { [x: string]: bigint }) => {
          m = (m as bigint) > item[field.name] ? m : item[field.name];
        });
      }
      m = (m as bigint) + 1n;
      autoincrement_cache[key] = m;
    } else {
      if (m === undefined) {
        m = 0;
        data[prop]?.forEach((item: { [x: string]: number }) => {
          m = Math.max(m as number, item[field.name]);
        });
      }
      m = (m as number) + 1;
      autoincrement_cache[key] = m;
    }

    return m;
  }
}
