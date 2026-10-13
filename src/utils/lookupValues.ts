// A Map or Set finds these the way the matcher's `!==` compares them, apart from NaN
export const isLookupValue = (value: any) =>
  typeof value === "string" ||
  typeof value === "boolean" ||
  typeof value === "bigint" ||
  (typeof value === "number" && !Number.isNaN(value))

/**
 * The values a filter on a single field pins that field to, when looking each of them up
 * finds every row the filter can match: a plain value, `equals` or `in`. Other operators next
 * to them only narrow the rows down further, which the matcher does afterwards. Strings
 * compared case insensitively can match values held in another case, so those aren't.
 *
 * @param filter - The filter on the field, as in `where[field]`
 * @param caseInsensitive - Whether the client compares string filters case insensitively
 * @returns The values to look up, or null when looking up can't answer the filter
 */
export const getLookupValues = (filter: any, caseInsensitive: boolean): any[] | null => {
  // A plain value is compared exactly, whatever caseInsensitive says
  if (isLookupValue(filter)) {
    return [filter]
  }
  if (!filter || typeof filter !== "object" || filter instanceof Date || Array.isArray(filter)) {
    return null
  }
  const isExact = (value: any) =>
    typeof value !== "string" || !(caseInsensitive || filter.mode === "insensitive")
  if ("equals" in filter) {
    return isLookupValue(filter.equals) && isExact(filter.equals) ? [filter.equals] : null
  }
  if (Array.isArray(filter.in) && filter.in.every((value) => isLookupValue(value) && isExact(value))) {
    return filter.in
  }
  return null
}
