import { Prisma } from "@prisma/client";
import { PrismaMockData } from "..";
export default function HandleDefault<P>(prop: string, field: Prisma.DMMF.Field, data: PrismaMockData<P>): any;
