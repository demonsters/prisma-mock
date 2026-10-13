// @ts-nocheck
import createPrismaClient from "./createPrismaClient"

// createMany created its rows one at a time, and each create copied the whole table to append
// its row, so a batch cost O(rows ^ 2): 30000 rows took ~1.5s here, against ~160ms now that the
// batch appends to one copy of the table.
//
// CI has run these tests anywhere from 4x to 20x slower than a laptop, which makes a fixed limit
// either flaky or blind to a regression. Instead this compares 30000 rows against 10000: three
// times the rows take about three times as long when the cost grows linearly, and about twelve
// times as long when it grows quadratically, on any machine.
const SMALL = 10000
const LARGE = 30000
const MAX_RATIO = 6

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

const timeCreateMany = async (numRows, createMany) => {
  const times = []
  for (let run = 0; run < 3; run++) {
    const client = await createPrismaClient({ user: [{ id: 1, uniqueField: "owner" }] })
    const start = performance.now()
    await createMany(client, numRows)
    times.push(performance.now() - start)
  }
  return median(times)
}

const users = (client, numRows) =>
  client.user.createMany({
    data: Array.from({ length: numRows }, (_, i) => ({ id: i + 2, uniqueField: `user-${i + 1}` })),
  })

// Pet has a @@unique, so its rows are also checked for compound key fields
const pets = (client, numRows) =>
  client.pet.createMany({
    data: Array.from({ length: numRows }, (_, i) => ({ id: i + 1, name: `pet-${i + 1}`, ownerId: 1 })),
  })

describe("createMany performance", () => {

  test.each([["@unique", users], ["@@unique", pets]])("a batch with a %s grows linearly with its number of rows", async (_, createMany) => {
    const small = await timeCreateMany(SMALL, createMany)
    const large = await timeCreateMany(LARGE, createMany)
    expect(large / small).toBeLessThan(MAX_RATIO)
  }, 30_000)

  // A row of a model with a compound key is also checked for compound key fields, which the
  // batch keeps track of instead of checking every row of the table again. Both are measured
  // in the same run, so this too holds on any machine: about 1x now, over 10x when that
  // tracking is lost
  test("a batch with a @@unique costs about the same as one without", async () => {
    const withoutCompoundKey = await timeCreateMany(LARGE, users)
    const withCompoundKey = await timeCreateMany(LARGE, pets)
    expect(withCompoundKey / withoutCompoundKey).toBeLessThan(3)
  }, 30_000)
})
