

// deepEqual
export function deepEqual(a: any, b: any) {
  if ((typeof a == 'object' && a != null) &&
    (typeof b == 'object' && b != null)) {
    var count = [0, 0]
    for (var key in a) count[0]++
    for (var key in b) count[1]++
    if (count[0] - count[1] != 0) { return false }
    for (var key in a) {
      if (!(key in b) || !deepEqual(a[key], b[key])) { return false }
    }
    for (var key in b) {
      if (!(key in a) || !deepEqual(b[key], a[key])) { return false }
    }
    return true
  }
  return a === b
}