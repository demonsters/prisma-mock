
export const shallowCompare = (
  a: { [key: string]: any },
  b: { [key: string]: any },
) => {
  // if (Object.keys(a).length !== Object.keys(b).length) return false
  for (let key in b) {
    if (a[key] instanceof Date) {
      if (b[key] === undefined) {
        return false
      }
      if (!(b[key] instanceof Date) || b[key].getTime() !== a[key].getTime()) {
        return false
      }
      continue
    }
    if (a[key] !== b[key]) return false
  }
  return true
}
