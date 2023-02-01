
export const shallowCompare = (
  a: { [key: string]: any },
  b: { [key: string]: any },
) => {
  for (let key in b) {
    if (a[key] !== b[key]) return false
  }
  return true
}
