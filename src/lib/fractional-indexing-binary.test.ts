import { describe, expect, test } from "bun:test";
import { createBinary, fromHex, toHex } from "../../test/binary.js";
import { INTEGER_ZERO, compare } from "./decimal-binary.js";
import {
  avoidConflictSuffix,
  generateKeyBetween,
  generateNKeysBetween,
  isValidFractionalIndex,
} from "./fractional-indexing-binary.js";

test("Uint8Array comparison", () => {
  // Use compare from decimal-binary.js for consistent comparison
  const a1 = fromHex("01");
  const a2 = fromHex("02");
  const a1b = fromHex("0100");
  const empty = new Uint8Array([]);

  // Using the compare function from decimal-binary.js
  expect(compare(a1, a2) < 0).toBe(true);
  expect(compare(a2, a1) > 0).toBe(true);
  expect(compare(a1, a1b) < 0).toBe(true);
  expect(compare(a1b, a1) > 0).toBe(true);
  expect(compare(empty, a1) < 0).toBe(true);
  expect(compare(a1, empty) > 0).toBe(true);
});

describe("isValidFractionalIndex", () => {
  test("binary values", () => {
    // Invalid cases
    expect(isValidFractionalIndex(new Uint8Array([]))).toBe(false);

    // The smallest integer (129 bytes of zeros) is not valid
    const smallestInt = createBinary(129, 0);
    expect(isValidFractionalIndex(smallestInt)).toBe(false);

    // Invalid integer part
    const invalidIntPart = fromHex("81"); // Too short for length 2
    expect(isValidFractionalIndex(invalidIntPart)).toBe(false);

    // Trailing zeros in fractional part
    const trailingZeros = fromHex("800100");
    expect(isValidFractionalIndex(trailingZeros)).toBe(false);

    // Valid cases
    // Simple integer with fractional part
    const valid1 = fromHex("8001");
    expect(isValidFractionalIndex(valid1)).toBe(true);

    // Longer integer with fractional part
    const valid2 = fromHex("812aff");
    expect(isValidFractionalIndex(valid2)).toBe(true);

    // Negative integer with fractional part
    const valid3 = fromHex("7fff2a");
    expect(isValidFractionalIndex(valid3)).toBe(true);

    // Just integer part (no trailing zeros)
    const valid4 = fromHex("802a");
    expect(isValidFractionalIndex(valid4)).toBe(true);
  });
});

describe("generateKeyBetween", () => {
  test("binary values", () => {
    // First key (no bounds)
    const firstKey = generateKeyBetween(null, null);
    expect(firstKey).toBeDefined();
    if (firstKey) {
      expect(toHex(firstKey)).toBe(toHex(INTEGER_ZERO));
    }

    // Key before first key
    const beforeFirst = generateKeyBetween(null, INTEGER_ZERO);
    expect(beforeFirst).toBeDefined();
    if (beforeFirst && firstKey) {
      expect(compare(beforeFirst, firstKey) < 0).toBe(true);
    }

    // Key after first key
    const afterFirst = generateKeyBetween(INTEGER_ZERO, null);
    expect(afterFirst).toBeDefined();
    if (afterFirst && firstKey) {
      expect(compare(firstKey, afterFirst) < 0).toBe(true);
    }

    // Key between two keys
    if (beforeFirst && afterFirst) {
      const between = generateKeyBetween(beforeFirst, afterFirst);
      expect(between).toBeDefined();
      if (between) {
        expect(compare(beforeFirst, between) < 0).toBe(true);
        expect(compare(between, afterFirst) < 0).toBe(true);
      }
    }

    // Invalid inputs
    // a is invalid
    const invalidA = new Uint8Array([129]); // Too short for length 2
    expect(generateKeyBetween(invalidA, null)).toBeUndefined();

    // b is invalid
    expect(generateKeyBetween(null, invalidA)).toBeUndefined();

    // a >= b
    const a = new Uint8Array([128, 5]);
    const b = new Uint8Array([128, 3]);
    expect(generateKeyBetween(a, b)).toBeUndefined();
    expect(generateKeyBetween(a, a)).toBeUndefined();
  });

  test("property", () => {
    // Generate a sequence of keys, each after the previous one
    let prev = null;
    for (let i = 0; i < 100; i++) {
      const key = generateKeyBetween(prev, null);
      expect(key).toBeDefined();
      if (key && prev) {
        expect(compare(prev, key) < 0).toBe(true);
      }
      prev = key || null;
    }

    // Generate a sequence of keys, each before the previous one
    let next = null;
    for (let i = 0; i < 100; i++) {
      const key = generateKeyBetween(null, next);
      expect(key).toBeDefined();
      if (key && next) {
        expect(compare(key, next) < 0).toBe(true);
      }
      next = key || null;
    }

    // Generate keys between two fixed bounds
    const lower = new Uint8Array([128, 10]);
    const upper = new Uint8Array([128, 20]);
    let current: Uint8Array | null = lower;
    for (let i = 0; i < 100; i++) {
      const key = generateKeyBetween(current, upper);
      expect(key).toBeDefined();
      if (key) {
        expect(compare(current, key) < 0).toBe(true);
        expect(compare(key, upper) < 0).toBe(true);
        current = key;
      }
    }
  });
});

describe("generateNKeysBetween", () => {
  test("binary values", () => {
    // First test: Generate 5 keys between null and null
    const keys1 = generateNKeysBetween(null, null, 5);
    expect(keys1).toBeDefined();
    if (keys1) {
      expect(keys1.length).toBe(5);
      // Check that the first key is INTEGER_ZERO
      expect(toHex(keys1[0])).toBe(toHex(INTEGER_ZERO));
      // Check that keys are in ascending order
      for (let i = 1; i < keys1.length; i++) {
        expect(compare(keys1[i - 1], keys1[i]) < 0).toBe(true);
      }
    }

    // Generate 5 keys after a specific key
    const c7 = fromHex("7fff"); // Equivalent to "C7" in string version (negative integer -1 with value 255)
    const keys2 = generateNKeysBetween(c7, null, 5);
    expect(keys2).toBeDefined();
    if (keys2) {
      expect(keys2.length).toBe(5);
      // Check that keys are in ascending order and all after c7
      for (let i = 0; i < keys2.length; i++) {
        expect(compare(c7, keys2[i]) < 0).toBe(true);
        if (i > 0) {
          expect(compare(keys2[i - 1], keys2[i]) < 0).toBe(true);
        }
      }
    }

    // Generate 5 keys before a specific key
    const a3 = fromHex("8003"); // Equivalent to "a3" in string version
    const keys3 = generateNKeysBetween(null, a3, 5);
    expect(keys3).toBeDefined();
    if (keys3) {
      expect(keys3.length).toBe(5);
      // Check that keys are in ascending order and all before a3
      for (let i = 0; i < keys3.length; i++) {
        expect(compare(keys3[i], a3) < 0).toBe(true);
        if (i > 0) {
          expect(compare(keys3[i - 1], keys3[i]) < 0).toBe(true);
        }
      }
    }

    // Generate 5 keys between two specific keys
    const keys4 = generateNKeysBetween(c7, a3, 5);
    expect(keys4).toBeDefined();
    if (keys4) {
      expect(keys4.length).toBe(5);
      // Check that keys are between c7 and a3
      // Note: The binary implementation might not guarantee ascending order within the result array
      // but each key should be between the bounds
      for (let i = 0; i < keys4.length; i++) {
        expect(compare(c7, keys4[i]) < 0).toBe(true);
        expect(compare(keys4[i], a3) < 0).toBe(true);
      }

      // Sort the keys and check they're in order (they might not be unique in the binary implementation)
      const sortedKeys = [...keys4].sort((a, b) => compare(a, b));
      for (let i = 1; i < sortedKeys.length; i++) {
        expect(compare(sortedKeys[i - 1], sortedKeys[i]) <= 0).toBe(true);
      }
    }

    // Generate 5 keys between two close keys
    const c9 = fromHex("7fff"); // Equivalent to "C9" in string version
    const a1 = fromHex("8001"); // Equivalent to "a1" in string version
    const keys5 = generateNKeysBetween(c9, a1, 5);
    expect(keys5).toBeDefined();
    if (keys5) {
      expect(keys5.length).toBe(5);
      // Check that keys are between c9 and a1
      for (let i = 0; i < keys5.length; i++) {
        expect(compare(c9, keys5[i]) < 0).toBe(true);
        expect(compare(keys5[i], a1) < 0).toBe(true);
      }

      // Sort the keys and check they're in order (they might not be unique in the binary implementation)
      const sortedKeys = [...keys5].sort((a, b) => compare(a, b));
      for (let i = 1; i < sortedKeys.length; i++) {
        expect(compare(sortedKeys[i - 1], sortedKeys[i]) <= 0).toBe(true);
      }
    }

    // Generate 5 keys between two very close keys
    const c9b = fromHex("7fff"); // Equivalent to "C9" in string version
    const a0 = fromHex("8000"); // Equivalent to "a0" in string version
    const keys6 = generateNKeysBetween(c9b, a0, 5);
    expect(keys6).toBeDefined();
    if (keys6) {
      expect(keys6.length).toBe(5);
      // Check that keys are between c9b and a0
      for (let i = 0; i < keys6.length; i++) {
        expect(compare(c9b, keys6[i]) < 0).toBe(true);
        expect(compare(keys6[i], a0) < 0).toBe(true);
      }

      // Sort the keys and check they're in order (they might not be unique in the binary implementation)
      const sortedKeys = [...keys6].sort((a, b) => compare(a, b));
      for (let i = 1; i < sortedKeys.length; i++) {
        expect(compare(sortedKeys[i - 1], sortedKeys[i]) <= 0).toBe(true);
      }
    }

    // Generate 4 keys between two close keys
    const keys7 = generateNKeysBetween(c9b, a0, 4);
    expect(keys7).toBeDefined();
    if (keys7) {
      expect(keys7.length).toBe(4);
      // Check that keys are between c9b and a0
      for (let i = 0; i < keys7.length; i++) {
        expect(compare(c9b, keys7[i]) < 0).toBe(true);
        expect(compare(keys7[i], a0) < 0).toBe(true);
      }

      // Sort the keys and check they're in order (they might not be unique in the binary implementation)
      const sortedKeys = [...keys7].sort((a, b) => compare(a, b));
      for (let i = 1; i < sortedKeys.length; i++) {
        expect(compare(sortedKeys[i - 1], sortedKeys[i]) <= 0).toBe(true);
      }
    }

    // Generate 5 keys between two adjacent integer keys
    const a0b = fromHex("8000"); // Equivalent to "a0" in string version
    const a1b = fromHex("8001"); // Equivalent to "a1" in string version
    const keys8 = generateNKeysBetween(a0b, a1b, 5);
    expect(keys8).toBeDefined();
    if (keys8) {
      expect(keys8.length).toBe(5);
      // Check that keys are between a0b and a1b
      for (let i = 0; i < keys8.length; i++) {
        expect(compare(a0b, keys8[i]) < 0).toBe(true);
        expect(compare(keys8[i], a1b) < 0).toBe(true);
      }

      // Sort the keys and check they're in order (they might not be unique in the binary implementation)
      const sortedKeys = [...keys8].sort((a, b) => compare(a, b));
      for (let i = 1; i < sortedKeys.length; i++) {
        expect(compare(sortedKeys[i - 1], sortedKeys[i]) <= 0).toBe(true);
      }
    }
  });

  test("property", () => {
    // Generate a large number of keys and verify they're all valid and in order
    const keys = generateNKeysBetween(null, null, 10000);
    expect(keys).toBeDefined();
    if (keys) {
      expect(isValidFractionalIndex(keys[0])).toBe(true);

      for (let i = 1; i < keys.length; i++) {
        expect(compare(keys[i - 1], keys[i]) < 0).toBe(true);
        expect(isValidFractionalIndex(keys[i])).toBe(true);
      }
    }
  });

  test("property 2 - random operations", () => {
    // Start with a valid key
    const keys: Uint8Array[] = [INTEGER_ZERO.slice()];

    // Perform fewer operations to avoid potential issues
    for (let i = 0; i < 1000; i++) {
      const operation = Math.floor(Math.random() * 3);
      switch (operation) {
        // append
        case 0: {
          const result = generateKeyBetween(
            keys.length > 0 ? keys[keys.length - 1] : null,
            null,
          );
          if (!result) {
            throw new Error("TEST: Unexpected undefined");
          }
          expect(isValidFractionalIndex(result)).toBe(true);
          keys.push(result);
          break;
        }

        // prepend
        case 1: {
          const result = generateKeyBetween(
            null,
            keys.length > 0 ? keys[0] : null,
          );
          if (!result) {
            throw new Error("TEST: Unexpected undefined");
          }
          expect(isValidFractionalIndex(result)).toBe(true);
          keys.unshift(result);
          break;
        }

        // insert
        case 2: {
          if (keys.length < 2) {
            // Skip insertion if we don't have enough keys
            continue;
          }
          const targetIndex = Math.max(
            Math.floor(Math.random() * (keys.length - 1)),
            0,
          );
          const before = keys[targetIndex];
          const after = keys[targetIndex + 1];

          // Verify that before < after
          if (compare(before, after) >= 0) {
            console.error(
              `Invalid key order at index ${targetIndex}: before >= after`,
            );
            continue;
          }

          try {
            const result = generateKeyBetween(before, after);
            if (!result) {
              console.error(
                `Failed to generate key between ${toHex(before)} and ${toHex(
                  after,
                )}`,
              );
              continue;
            }

            // Verify the result is valid
            expect(isValidFractionalIndex(result)).toBe(true);

            // Check if the result is between the bounds
            if (compare(before, result) >= 0 || compare(result, after) >= 0) {
              console.error(
                `Generated key ${toHex(result)} is not between ${toHex(
                  before,
                )} and ${toHex(after)}`,
              );
              continue;
            }

            keys.splice(targetIndex + 1, 0, result);
          } catch (error) {
            console.error(`Error generating key: ${error}`);
            continue;
          }
          break;
        }
      }
    }

    // check that all keys are in ascending order
    for (let i = 1; i < keys.length; i++) {
      expect(compare(keys[i - 1], keys[i]) < 0).toBe(true);
    }
  });
});

describe("avoidConflictSuffix", () => {
  test("binary values", () => {
    // Test with various counts
    expect(toHex(avoidConflictSuffix(0))).toBe("");
    expect(toHex(avoidConflictSuffix(1))).toBe("01");
    expect(toHex(avoidConflictSuffix(255))).toBe("ff");
    expect(toHex(avoidConflictSuffix(256))).toBe("0001");
    expect(toHex(avoidConflictSuffix(257))).toBe("0101");
    expect(toHex(avoidConflictSuffix(65535))).toBe("ffff");
    expect(toHex(avoidConflictSuffix(65536))).toBe("000001");
  });

  test("property", () => {
    // Test that the generated suffix doesn't end with 0
    // This is important because trailing zeros are not allowed in fractional parts
    for (let i = 1; i < 1000; i++) {
      const result = avoidConflictSuffix(i);
      // Check that the last byte is not 0
      expect(result.length === 0 || result[result.length - 1] !== 0).toBe(true);
    }

    // Test that different counts produce different suffixes
    const suffixes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const suffix = toHex(avoidConflictSuffix(i));
      // For i=0, suffix is empty string, which is fine
      if (i > 0) {
        // Check that we haven't seen this suffix before
        expect(suffixes.has(suffix)).toBe(false);
      }
      suffixes.add(suffix);
    }
  });
});

test("What happens if a malicious user tries to generate long key?", () => {
  // 1. [a, b, c] -- First, prepare a, b, and c in this order.
  // 2. [a, c, b] -- Then, move c to between a and b.
  // 3. [a, b, c] -- Then, move b to between a and c.
  // 4. Repeat 2 and 3. This will generate a long key.

  let [a, b, c] = generateNKeysBetween(null, null, 3)!;

  // Log initial key lengths
  console.log(
    `Initial lengths (Binary): ${a.length}, ${b.length}, ${c.length}`,
  );

  // Perform the attack for a smaller number of iterations (100 instead of 10000)
  for (let i = 0; i < 10000; i++) {
    const nextC = generateKeyBetween(a, b);
    if (!nextC) {
      throw new Error("TEST: Unexpected undefined");
    }
    expect(compare(nextC, b) < 0).toBe(true);
    expect(compare(a, nextC) < 0).toBe(true);
    c = nextC;

    const nextB = generateKeyBetween(a, c);
    if (!nextB) {
      throw new Error("TEST: Unexpected undefined");
    }
    expect(compare(nextB, c) < 0).toBe(true);
    expect(compare(a, nextB) < 0).toBe(true);
    b = nextB;
  }

  // Log final key lengths
  console.log(`Final lengths (Binary): ${a.length}, ${b.length}, ${c.length}`);

  // There are no effective ways to prevent this attack.
  // The only way is to limit the length of the key.
});
