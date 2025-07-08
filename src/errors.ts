import { Prisma } from "@prisma/client"

const throwPrismaError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}, errorClass: any = Prisma.PrismaClientKnownRequestError) => {
  const clientVersion = Prisma.prismaVersion.client
  // PrismaClientKnownRequestError prototype changed in version 4.7.0
  // from: constructor(message: string, code: string, clientVersion: string, meta?: any)
  // to: constructor(message: string, { code, clientVersion, meta, batchRequestIdx }: KnownErrorParams)
  let error
  if (errorClass.length === 2) {
    // @ts-ignore
    error = new errorClass(message, {
      code,
      clientVersion,
    })
  } else {
    // @ts-ignore
    error = new errorClass(
      message,
      // @ts-ignore
      code,
      // @ts-ignore
      clientVersion
    )
  }
  error.meta = meta
  throw error
}

export const throwKnownError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}) => {
  throwPrismaError(message, { code, meta }, Prisma.PrismaClientKnownRequestError)
}

export const throwValidationError = (message: string, { code = "P2025", meta }: { code?: string, meta?: any } = {}) => {
  throwPrismaError(message, { code, meta }, Prisma.PrismaClientValidationError)
} 