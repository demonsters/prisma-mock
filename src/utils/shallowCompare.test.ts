import { shallowCompare } from "./shallowCompare"

describe('shallowCompare', () => {
  test('should return true for identical objects', () => {
    const a = { a: 1, b: 'test', c: true }
    const b = { a: 1, b: 'test', c: true }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false for different values', () => {
    const a = { a: 1, b: 'test' }
    const b = { a: 2, b: 'test' }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should return true for identical Date objects', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-01')
    const a = { date: date1 }
    const b = { date: date2 }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false for different Date objects', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2024-01-01')
    const a = { date: date1 }
    const b = { date: date2 }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should return false when a has Date but b has undefined', () => {
    const date = new Date('2023-01-01')
    const a = { date }
    const b = { date: undefined }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should return false when a has Date but b has non-Date value', () => {
    const date = new Date('2023-01-01')
    const a = { date }
    const b = { date: 'not a date' }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should return true when b has Date but a has same Date', () => {
    const date1 = new Date('2023-01-01')
    const date2 = new Date('2023-01-01')
    const a = { date: date1 }
    const b = { date: date2 }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should NOT ignore extra keys in a', () => {
    const a = { a: 1, b: 2, c: 3 }
    const b = { a: 1, b: 2 }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false when b has key not in a', () => {
    const a = { a: 1 }
    const b = { a: 1, b: 2 }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should handle null values', () => {
    const a = { a: null, b: 1 }
    const b = { a: null, b: 1 }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false when null differs from undefined', () => {
    const a = { a: null }
    const b = { a: undefined }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should handle nested objects by reference', () => {
    const nested = { x: 1 }
    const a = { nested }
    const b = { nested }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false for nested objects with same structure but different reference', () => {
    const a = { nested: { x: 1 } }
    const b = { nested: { x: 1 } }
    expect(shallowCompare(a, b)).toBe(false)
  })

  test('should handle empty objects', () => {
    const a = {}
    const b = {}
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return true when b is empty but a has keys', () => {
    const a = { a: 1 }
    const b = {}
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should handle arrays by reference', () => {
    const arr = [1, 2, 3]
    const a = { arr }
    const b = { arr }
    expect(shallowCompare(a, b)).toBe(true)
  })

  test('should return false for arrays with same values but different reference', () => {
    const a = { arr: [1, 2, 3] }
    const b = { arr: [1, 2, 3] }
    expect(shallowCompare(a, b)).toBe(false)
  })
})

