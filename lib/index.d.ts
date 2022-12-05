import { Prisma } from '@prisma/client';
declare type UnwrapPromise<P extends any> = P extends Promise<infer R> ? R : P;
declare type PrismaDelegate = {
    findUnique: (...args: Array<any>) => Promise<any>;
};
declare type IsTable<S> = S extends `\$${infer fnc}` ? never : S;
declare type IsString<S extends any> = S extends string ? S : never;
declare type PrismaList<P extends {
    [key: string]: any;
}, K extends string> = P[K] extends PrismaDelegate ? Array<Partial<UnwrapPromise<ReturnType<P[K]["findUnique"]>>>> : never;
export declare type PrismaMockData<P> = Partial<{
    [key in IsTable<Uncapitalize<IsString<keyof P>>>]: PrismaList<P, key>;
}>;
declare const createPrismaMock: <P>(data?: Partial<{ [key in IsTable<Uncapitalize<IsString<keyof P>>>]: PrismaList<P, key>; }>, datamodel?: Prisma.DMMF.Datamodel, client?: { [K in keyof P]: P[K] extends (...args: infer A) => infer B ? import("jest-mock-extended").CalledWithMock<B, A> : import("jest-mock-extended").DeepMockProxy<P[K]>; } & P) => P;
export default createPrismaMock;
