import { deepCopy } from "../../src/utils/deepCopy"

describe('deepCopy', () => {
  it('should copy primitive values', () => {
    expect(deepCopy(42)).toBe(42);
    expect(deepCopy('hello')).toBe('hello');
    expect(deepCopy(true)).toBe(true);
  });

  it('should copy arrays', () => {
    const arr = [1, 2, 3];
    const copy = deepCopy(arr);
    expect(copy).toEqual(arr);
    expect(copy).not.toBe(arr);
  });

  it('should copy objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
    expect(copy).not.toBe(obj);
    expect(copy.b).not.toBe(obj.b);
  });

  it('should copy dates', () => {
    const date = new Date();
    const copy = deepCopy(date);
    expect(copy).toEqual(date);
    expect(copy).not.toBe(date);
  });

  it('should handle null and undefined', () => {
    expect(deepCopy(null)).toBeNull();
    expect(deepCopy(undefined)).toBeUndefined();
  });
});
