import { Prisma } from "@prisma/client"

export type DeepMockApi = {
  mockImplementation: (fnc: any) => void
}

export type UnwrapPromise<P extends any> = P extends Promise<infer R> ? R : P

export type PrismaDelegate = {
  findUnique: (...args: Array<any>) => Promise<any>
}

export type IsTable<S> = S extends `\$${infer fnc}` ? never : S
export type IsString<S extends any> = S extends string ? S : never

export type PrismaList<
  P extends { [key: string]: any },
  K extends string
> = P[K] extends PrismaDelegate
  ? Array<Partial<UnwrapPromise<ReturnType<P[K]["findUnique"]>>>>
  : never

export type PrismaMockData<P> = Partial<{
  [key in IsTable<Uncapitalize<IsString<keyof P>>>]: PrismaList<P, key>
}>

export type Where = any
export type Item = any
export type Args = any
export type CreateArgs = any

export type MockPrismaOptions = {
  caseInsensitive?: boolean
} 