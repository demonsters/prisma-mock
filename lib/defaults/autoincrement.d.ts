import { Prisma } from "@prisma/client";
import { PrismaMockData } from "..";
export default function autoincrement<P>(prop: string, field: Prisma.DMMF.Field, data?: PrismaMockData<P>): Number;
export declare function reset(): void;
