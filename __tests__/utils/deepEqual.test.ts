import { deepEqual } from "../../src/utils/deepEqual"

describe('deepEqual', () => {
  test('should return true for identical objects', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    expect(deepEqual(obj1, obj2)).toBeTruthy();
  });

  test('should return false for different objects', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 3 } };
    expect(deepEqual(obj1, obj2)).toBeFalsy();
  });

  test('should return true for identical arrays', () => {
    const arr1 = [1, 2, { a: 3 }];
    const arr2 = [1, 2, { a: 3 }];
    expect(deepEqual(arr1, arr2)).toBeTruthy();
  });

  test('should return false for different arrays', () => {
    const arr1 = [1, 2, { a: 3 }];
    const arr2 = [1, 2, { a: 4 }];
    expect(deepEqual(arr1, arr2)).toBeFalsy();
  });

  test('should return true for identical primitive values', () => {
    expect(deepEqual(1, 1)).toBeTruthy();
    expect(deepEqual('test', 'test')).toBeTruthy();
    expect(deepEqual(null, null)).toBeTruthy();
    expect(deepEqual(undefined, undefined)).toBeTruthy();
  });

  test('should return false for different primitive values', () => {
    expect(deepEqual(1, 2)).toBeFalsy();
    expect(deepEqual('test', 'Test')).toBeFalsy();
    expect(deepEqual(null, undefined)).toBeFalsy();
  });

  test('should return true for identical Date objects', () => {
    const date1 = new Date('2023-01-01');
    const date2 = new Date('2023-01-01');
    expect(deepEqual(date1, date2)).toBeTruthy();
  });

  test('should return false for different Date objects', () => {
    const date1 = new Date('2023-01-01');
    const date2 = new Date('2024-01-01');
    expect(deepEqual(date1, date2)).toBeFalsy();
  });

  test('should return false for Date and an object', () => {
    const date1 = new Date('2023-01-01');
    expect(deepEqual(date1, {})).toBeFalsy();
    expect(deepEqual({}, date1)).toBeFalsy();
  });
});
