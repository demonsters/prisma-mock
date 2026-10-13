// @ts-nocheck

import { Prisma } from "@prisma/client"
import { createDelegate, delegateMethodNames } from "../src/delegate"

// The client binds the operations in delegateMethodNames without building a delegate, so
// the list has to name every public operation a delegate has
test("delegateMethodNames lists every public operation of a delegate", () => {
  const Delegate = createDelegate({ ref: { data: {} }, prisma: Prisma, datamodel: Prisma.dmmf.datamodel, caseInsensitive: false })
  const model = Prisma.dmmf.datamodel.models.find((model) => model.name === "User")
  const names = Object.keys(Delegate("user", model)).filter((name) => !name.startsWith("_"))
  expect([...delegateMethodNames].sort()).toEqual(names.sort())
})
