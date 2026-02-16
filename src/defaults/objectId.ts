/**
 * Generates MongoDB ObjectId-like strings (24 hex chars).
 * Used for @default(auto()) with @db.ObjectId
 */
const createObjectId = () => {
  let counter = 0
  return () => {
    const hex = "0123456789abcdef"
    let result = ""
    for (let i = 0; i < 22; i++) {
      result += hex[Math.floor(Math.random() * 16)]
    }
    result += (++counter).toString(16).padStart(2, "0")
    return result
  }
}

export default createObjectId
