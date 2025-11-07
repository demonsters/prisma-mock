#!/usr/bin/env node
import { writeFile } from "fs/promises"
import helper from "@prisma/generator-helper"

helper.generatorHandler({
  onManifest: () => ({
    prettyName: "prisma-mock",
    version: "1.0.0",
  }),
  onGenerate({ generator, dmmf }) {
    if (!generator.output?.value)
      throw new Error("Missing output path in generator configuration")

    const exports = Object.entries(dmmf.datamodel).reduce(
      (acc, [k, v], idx, arr) =>
        acc +
        `export const ${k} = ${JSON.stringify(v, null, 2)};\n${
          arr[idx + 1] ? "\n" : ""
        }`,
      ""
    )

    return writeFile(generator.output.value, exports, "utf8")
  },
})
