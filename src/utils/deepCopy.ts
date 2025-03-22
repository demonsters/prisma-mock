export function deepCopy<T>(source:T): T {
  if (Object(source) !== source)
  {
    // primitive
    return source
  } else if (Array.isArray(source))
  {
    return source.map(deepCopy) as T
  } else if (source instanceof Date)
  {
    return new Date(source) as unknown as T
  }

  return Object.fromEntries(Object.entries(source).map(([k,v]) => ([k, deepCopy(v)]))) as T
}
