// @ts-nocheck

import { spawn } from "cross-spawn"
import { PrismaClient } from "@prisma/client"
import createPrismaMock from "../src/"


const reset = async () => await new Promise((res, rej) => {
  // const prismaBin = which(process.cwd()).sync("prisma")
  const process = spawn("node_modules/.bin/prisma", ["migrate", "reset", "--force", "--skip-generate"], {
    stdio: "ignore",
  })
  process.on("exit", (code) =>
    code === 0 ? res(0) : rej(new Error(`reset failed with code ${code}`)),
  )
})

const push = async () => await new Promise((res, rej) => {
  // const prismaBin = which(process.cwd()).sync("prisma")
  const process = spawn("node_modules/.bin/prisma", ["db", "push"], {
    stdio: "ignore",
  })
  process.on("exit", (code) =>
    code === 0 ? res(0) : rej(new Error(`push failed with code ${code}`)),
  )
})

export default async function createPrismaClient(data?: any, options?: any) {

  const isReal = process.env.PROVIDER === "postgresql"

  let client = isReal ? new PrismaClient() : createPrismaMock<PrismaClient>({}, undefined, undefined, options)

  if (isReal) {

    if (global.globalClient) {
      await global.globalClient.$disconnect()
    }
    global.globalClient = client

    await reset()
    await push()
    await client.$connect()
  }

  if (data) {
    const modelnames = Object.keys(data)
    for (const modelname of modelnames) {
      const model = data[modelname]
      await client[modelname].createMany({
        data: model,
      })
    }
  }

  return client
}

