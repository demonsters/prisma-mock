export default function getNestedValue(keys: string[], values: any) {
  const keysCopy = [...keys]
  let key: string | undefined
  let object: any = values
  while ((key = keysCopy.shift())) {
    if (Array.isArray(object)) {
      object = object?.[parseInt(key)]
    } else {
      object = object?.[key]
    }
  }
  return object
}
