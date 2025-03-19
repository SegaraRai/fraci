import { describe, expect, test } from "bun:test";
import { createBinary, fromHex, toHex } from "../../test/binary.js";
import {
  compare,
  concat,
  decrementInteger,
  getIntegerLengthByte,
  getIntegerLengthSigned,
  getMidpointFractional,
  incrementInteger,
  INTEGER_MINUS_ONE,
  INTEGER_ZERO,
  isSmallestInteger,
  splitParts,
} from "./decimal-binary.js";

describe("getIntegerLengthSigned", () => {
  test("binary values", () => {
    // Positive lengths
    expect(getIntegerLengthSigned(new Uint8Array([128, 0]))).toBe(1);
    expect(getIntegerLengthSigned(new Uint8Array([129, 0]))).toBe(2);
    expect(getIntegerLengthSigned(new Uint8Array([255, 0]))).toBe(128);

    // Negative lengths
    expect(getIntegerLengthSigned(new Uint8Array([127, 0]))).toBe(-1);
    expect(getIntegerLengthSigned(new Uint8Array([126, 0]))).toBe(-2);
    expect(getIntegerLengthSigned(new Uint8Array([0, 0]))).toBe(-128);

    // Edge cases
    expect(getIntegerLengthSigned(new Uint8Array([128]))).toBe(1);
    expect(getIntegerLengthSigned(new Uint8Array([0]))).toBe(-128);

    // Invalid cases are handled by the type system (Uint8Array can't be empty)
  });
});

describe("getIntegerLengthByte", () => {
  test("binary values", () => {
    // Positive lengths
    expect(getIntegerLengthByte(1)).toBe(128);
    expect(getIntegerLengthByte(2)).toBe(129);
    expect(getIntegerLengthByte(128)).toBe(255);

    // Negative lengths
    expect(getIntegerLengthByte(-1)).toBe(127);
    expect(getIntegerLengthByte(-2)).toBe(126);
    expect(getIntegerLengthByte(-128)).toBe(0);

    // Edge cases
    expect(getIntegerLengthByte(0)).toBe(127); // Zero is treated as positive
  });
});

describe("splitParts", () => {
  test("binary values", () => {
    // Positive length (length 1)
    const posLen1 = new Uint8Array([128, 42]);
    const posLen1Parts = splitParts(posLen1);
    expect(posLen1Parts).toBeDefined();
    expect(toHex(posLen1Parts![0])).toBe(toHex(new Uint8Array([128, 42])));
    expect(toHex(posLen1Parts![1])).toBe("");

    // Positive length (length 2)
    const posLen2 = new Uint8Array([129, 42, 255]);
    const posLen2Parts = splitParts(posLen2);
    expect(posLen2Parts).toBeDefined();
    expect(toHex(posLen2Parts![0])).toBe(toHex(new Uint8Array([129, 42, 255])));
    expect(toHex(posLen2Parts![1])).toBe("");

    // Negative length (length 1)
    const negLen1 = new Uint8Array([127, 42]);
    const negLen1Parts = splitParts(negLen1);
    expect(negLen1Parts).toBeDefined();
    expect(toHex(negLen1Parts![0])).toBe(toHex(new Uint8Array([127, 42])));
    expect(toHex(negLen1Parts![1])).toBe("");

    // Negative length (length 2)
    const negLen2 = new Uint8Array([126, 42, 255]);
    const negLen2Parts = splitParts(negLen2);
    expect(negLen2Parts).toBeDefined();
    expect(toHex(negLen2Parts![0])).toBe(toHex(new Uint8Array([126, 42, 255])));
    expect(toHex(negLen2Parts![1])).toBe("");

    // With fractional part
    const withFrac = new Uint8Array([128, 0, 42, 255]);
    const withFracParts = splitParts(withFrac);
    expect(withFracParts).toBeDefined();
    expect(toHex(withFracParts![0])).toBe(toHex(new Uint8Array([128, 0])));
    expect(toHex(withFracParts![1])).toBe(toHex(new Uint8Array([42, 255])));

    // No fractional part
    const noFrac = new Uint8Array([128, 0]);
    const noFracParts = splitParts(noFrac);
    expect(noFracParts).toBeDefined();
    expect(toHex(noFracParts![0])).toBe(toHex(new Uint8Array([128, 0])));
    expect(toHex(noFracParts![1])).toBe("");

    // Too short
    const tooShort = new Uint8Array([128]);
    expect(splitParts(tooShort)).toBeUndefined();

    // Empty array (invalid)
    expect(splitParts(new Uint8Array([]))).toBeUndefined();
  });
});

describe("INTEGER_ZERO", () => {
  test("binary value", () => {
    expect(toHex(INTEGER_ZERO)).toBe(toHex(new Uint8Array([128, 0])));
    // Verify it's a constant with the correct value
    expect(INTEGER_ZERO.length).toBe(2);
    expect(INTEGER_ZERO[0]).toBe(128);
    expect(INTEGER_ZERO[1]).toBe(0);
  });
});

describe("INTEGER_MINUS_ONE", () => {
  test("binary value", () => {
    expect(toHex(INTEGER_MINUS_ONE)).toBe(toHex(new Uint8Array([127, 255])));
    // Verify it's a constant with the correct value
    expect(INTEGER_MINUS_ONE.length).toBe(2);
    expect(INTEGER_MINUS_ONE[0]).toBe(127);
    expect(INTEGER_MINUS_ONE[1]).toBe(255);
  });
});

describe("isSmallestInteger", () => {
  test("binary values", () => {
    // The smallest integer is a 129-byte array with all zeros
    const smallestInt = createBinary(129, 0);
    expect(isSmallestInteger(smallestInt)).toBe(true);

    // Not the smallest integer
    expect(isSmallestInteger(INTEGER_ZERO)).toBe(false);
    expect(isSmallestInteger(INTEGER_MINUS_ONE)).toBe(false);

    // Wrong length
    const wrongLength = createBinary(128, 0);
    expect(isSmallestInteger(wrongLength)).toBe(false);

    const tooLong = createBinary(130, 0);
    expect(isSmallestInteger(tooLong)).toBe(false);

    // First byte not 0
    const wrongFirstByte = createBinary(129, 0);
    wrongFirstByte[0] = 1;
    expect(isSmallestInteger(wrongFirstByte)).toBe(false);

    // Not all zeros after first byte
    const notAllZeros = createBinary(129, 0);
    notAllZeros[128] = 1;
    expect(isSmallestInteger(notAllZeros)).toBe(false);

    const notAllZerosMiddle = createBinary(129, 0);
    notAllZerosMiddle[64] = 1;
    expect(isSmallestInteger(notAllZerosMiddle)).toBe(false);
  });
});

describe("incrementInteger", () => {
  test("binary values", () => {
    // Basic increment
    const basic = new Uint8Array([128, 0]);
    const basicIncremented = incrementInteger(basic);
    expect(basicIncremented).toBeDefined();
    expect(toHex(basicIncremented!)).toBe("8001");

    // Increment with carry
    const withCarry = new Uint8Array([128, 255]);
    const withCarryIncremented = incrementInteger(withCarry);
    expect(withCarryIncremented).toBeDefined();
    expect(toHex(withCarryIncremented!)).toBe("810000");

    // Multiple carries
    const multipleCarries = new Uint8Array([129, 255, 255]);
    const multipleCarriesIncremented = incrementInteger(multipleCarries);
    expect(multipleCarriesIncremented).toBeDefined();
    expect(toHex(multipleCarriesIncremented!)).toBe("82000000");

    // Multiple carries on negative length
    const multipleCarriesNegative = new Uint8Array([126, 255, 255]);
    const multipleCarriesNegativeIncremented = incrementInteger(
      multipleCarriesNegative
    );
    expect(multipleCarriesNegativeIncremented).toBeDefined();
    expect(toHex(multipleCarriesNegativeIncremented!)).toBe("7f00");

    // Increment -1 to 0
    const minusOne = new Uint8Array([127, 255]);
    const minusOneIncremented = incrementInteger(minusOne);
    expect(minusOneIncremented).toBeDefined();
    expect(toHex(minusOneIncremented!)).toBe("8000");

    // Increment -2 to -1
    const minusTwo = new Uint8Array([127, 254]);
    const minusTwoIncremented = incrementInteger(minusTwo);
    expect(minusTwoIncremented).toBeDefined();
    expect(toHex(minusTwoIncremented!)).toBe("7fff");

    // Increment at limit (should return null)
    const atLimit = createBinary(129, 255);
    const atLimitIncremented = incrementInteger(atLimit);
    expect(atLimitIncremented).toBeNull();

    // Invalid input (empty array)
    expect(incrementInteger(new Uint8Array([]))).toBeUndefined();
  });
});

describe("decrementInteger", () => {
  test("binary values", () => {
    // Basic decrement
    const basic = new Uint8Array([128, 1]);
    const basicDecremented = decrementInteger(basic);
    expect(basicDecremented).toBeDefined();
    expect(toHex(basicDecremented!)).toBe(toHex(new Uint8Array([128, 0])));

    // Decrement with borrow
    const withBorrow = new Uint8Array([129, 0, 0]);
    const withBorrowDecremented = decrementInteger(withBorrow);
    expect(withBorrowDecremented).toBeDefined();
    expect(toHex(withBorrowDecremented!)).toBe("80ff");

    // Multiple borrows
    const multipleBorrows = new Uint8Array([130, 0, 0, 0]);
    const multipleBorrowsDecremented = decrementInteger(multipleBorrows);
    expect(multipleBorrowsDecremented).toBeDefined();
    expect(toHex(multipleBorrowsDecremented!)).toBe("81ffff");

    // Multiple borrows on negative length
    const multipleBorrowsNegative = new Uint8Array([126, 0, 0, 0]);
    const multipleBorrowsNegativeDecremented = decrementInteger(
      multipleBorrowsNegative
    );
    expect(multipleBorrowsNegativeDecremented).toBeDefined();
    expect(toHex(multipleBorrowsNegativeDecremented!)).toBe("7dffffff");

    // Decrement 0 to -1
    const zero = new Uint8Array([128, 0]);
    const zeroDecremented = decrementInteger(zero);
    expect(zeroDecremented).toBeDefined();
    expect(toHex(zeroDecremented!)).toBe("7fff");

    // Decrement -1 to -2
    const minusOne = new Uint8Array([127, 255]);
    const minusOneDecremented = decrementInteger(minusOne);
    expect(minusOneDecremented).toBeDefined();
    expect(toHex(minusOneDecremented!)).toBe("7ffe");

    // Decrement at min value (should return null)
    const minValue = new Uint8Array([0, 0]);
    expect(decrementInteger(minValue)).toBeNull();

    // Decrement at limit (should return null)
    const atLimit = new Uint8Array(129);
    atLimit[0] = 0;
    for (let i = 1; i < 129; i++) {
      atLimit[i] = 0;
    }
    const atLimitDecremented = decrementInteger(atLimit);
    expect(atLimitDecremented).toBeNull();

    // Invalid input (NaN length)
    expect(decrementInteger(new Uint8Array([]))).toBeUndefined();
  });
});

describe("getMidpointFractional", () => {
  test("binary values", () => {
    // Simple midpoint
    const a = new Uint8Array([0]);
    const b = new Uint8Array([10]);
    const midpoint = getMidpointFractional(a, b);
    expect(midpoint).toBeDefined();
    expect(toHex(midpoint!)).toBe(toHex(new Uint8Array([5])));

    // Consecutive digits
    const consA = new Uint8Array([4]);
    const consB = new Uint8Array([5]);
    const consMidpoint = getMidpointFractional(consA, consB);
    expect(consMidpoint).toBeDefined();
    expect(toHex(consMidpoint!)).toBe(toHex(new Uint8Array([4, 128])));

    // With common prefix
    const prefixA = new Uint8Array([1, 2, 3]);
    const prefixB = new Uint8Array([1, 2, 8]);
    const prefixMidpoint = getMidpointFractional(prefixA, prefixB);
    expect(prefixMidpoint).toBeDefined();
    expect(toHex(prefixMidpoint!)).toBe(toHex(new Uint8Array([1, 2, 5])));

    // Longer common prefix
    const longPrefixA = new Uint8Array([1, 2, 3, 4, 5]);
    const longPrefixB = new Uint8Array([1, 2, 3, 7, 8]);
    const longPrefixMidpoint = getMidpointFractional(longPrefixA, longPrefixB);
    expect(longPrefixMidpoint).toBeDefined();
    expect(toHex(longPrefixMidpoint!)).toBe(
      toHex(new Uint8Array([1, 2, 3, 5]))
    );

    // Different lengths
    const diffLenA = new Uint8Array([1, 2, 3]);
    const diffLenB = new Uint8Array([1, 2, 3, 4, 5]);
    const diffLenMidpoint = getMidpointFractional(diffLenA, diffLenB);
    expect(diffLenMidpoint).toBeDefined();
    expect(toHex(diffLenMidpoint!)).toBe(toHex(new Uint8Array([1, 2, 3, 2])));

    // With null upper bound
    const nullUpperA = new Uint8Array([10]);
    const nullUpperMidpoint = getMidpointFractional(nullUpperA, null);
    expect(nullUpperMidpoint).toBeDefined();
    expect(toHex(nullUpperMidpoint!)).toBe(toHex(new Uint8Array([133])));

    // Complex case with null upper bound
    const complexA = new Uint8Array([255, 254, 253]);
    const complexMidpoint = getMidpointFractional(complexA, null);
    expect(complexMidpoint).toBeDefined();
    expect(toHex(complexMidpoint!)).toBe(toHex(new Uint8Array([255, 255])));

    // Empty array and null
    const emptyA = new Uint8Array([]);
    const emptyNullMidpoint = getMidpointFractional(emptyA, null);
    expect(emptyNullMidpoint).toBeDefined();
    expect(toHex(emptyNullMidpoint!)).toBe(toHex(new Uint8Array([128])));

    // Invalid inputs
    expect(getMidpointFractional(b, a)).toBeUndefined(); // a >= b
    expect(getMidpointFractional(b, b)).toBeUndefined(); // a === b
  });
});

describe("compare", () => {
  test("binary values", () => {
    const a = fromHex("010203");
    const b = fromHex("010203");
    const c = fromHex("010204");
    const d = fromHex("0102");
    const e = fromHex("010303");
    const f = fromHex("");
    const g = fromHex("00");

    expect(compare(a, b)).toBe(0); // Equal
    expect(compare(a, c)).toBeLessThan(0); // a < c
    expect(compare(c, a)).toBeGreaterThan(0); // c > a
    expect(compare(a, d)).toBeGreaterThan(0); // a > d (longer)
    expect(compare(d, a)).toBeLessThan(0); // d < a (shorter)
    expect(compare(a, e)).toBeLessThan(0); // a < e (different middle value)
    expect(compare(f, f)).toBe(0); // Empty arrays are equal
    expect(compare(f, g)).toBeLessThan(0); // Empty array < non-empty array
    expect(compare(g, f)).toBeGreaterThan(0); // Non-empty array > empty array

    // Edge cases
    const h = fromHex("ff");
    const i = fromHex("00");
    expect(compare(h, i)).toBeGreaterThan(0); // 0xff > 0x00

    // Arrays with same prefix but different lengths
    const j = fromHex("010203");
    const k = fromHex("01020300");
    expect(compare(j, k)).toBeLessThan(0); // j < k (k has extra bytes)
    expect(compare(k, j)).toBeGreaterThan(0); // k > j (k has extra bytes)
  });
});

describe("concat", () => {
  test("binary values", () => {
    const a = fromHex("0102");
    const b = fromHex("030405");
    const result = concat(a, b);

    expect(toHex(result)).toBe("0102030405");
    expect(result.length).toBe(a.length + b.length);

    // Empty arrays
    expect(toHex(concat(new Uint8Array([]), b))).toBe(toHex(b));
    expect(toHex(concat(a, new Uint8Array([])))).toBe(toHex(a));
    expect(toHex(concat(new Uint8Array([]), new Uint8Array([])))).toBe("");

    // Large arrays
    const large1 = createBinary(1000, 0x11);
    const large2 = createBinary(1000, 0x22);
    const largeResult = concat(large1, large2);
    expect(largeResult.length).toBe(2000);
    expect(largeResult[0]).toBe(0x11);
    expect(largeResult[999]).toBe(0x11);
    expect(largeResult[1000]).toBe(0x22);
    expect(largeResult[1999]).toBe(0x22);
  });
});
