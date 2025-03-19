import { describe, expect, test } from "bun:test";
import { BASE95 } from "../bases.js";
import { getSmallestInteger } from "./decimal-string.js";
import {
  avoidConflictSuffix,
  generateKeyBetween,
  generateNKeysBetween,
  isValidFractionalIndex,
} from "./fractional-indexing-string.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./utils.js";

const TEST_BASE6 = "ABCabc";
const TEST_BASE10 = "0123456789";
const [LEN_FORWARD, LEN_REVERSE] = createIntegerLengthBaseMap(TEST_BASE6);
const [DIG_FORWARD, DIG_REVERSE] = createDigitBaseMap(TEST_BASE10);
const MIN_INT = getSmallestInteger(DIG_FORWARD, LEN_FORWARD);

const [L_LEN_FORWARD, L_LEN_REVERSE] = createIntegerLengthBaseMap(BASE95);
const [L_DIG_FORWARD, L_DIG_REVERSE] = createDigitBaseMap(BASE95);
const L_MIN_INT = getSmallestInteger(L_DIG_FORWARD, L_LEN_FORWARD);

test("JS string comparison", () => {
  expect("A" < "B").toBe(true);
  expect("A" < "a").toBe(true);
  expect("A" < "A0").toBe(true);
  expect("A" < "Aa").toBe(true);
  expect("A" < "AA").toBe(true);
  expect("A" < "A_").toBe(true);
  expect("A" < "A-").toBe(true);
  expect("A" < "A ").toBe(true);
  expect("" < "A").toBe(true);
});

describe("isValidFractionalIndex", () => {
  const args = [DIG_FORWARD, DIG_REVERSE, LEN_REVERSE, MIN_INT] as const;

  test("basic", () => {
    expect(isValidFractionalIndex("", ...args)).toBe(false);
    expect(isValidFractionalIndex("*", ...args)).toBe(false);
    expect(isValidFractionalIndex("a", ...args)).toBe(false);
    expect(isValidFractionalIndex("aa", ...args)).toBe(false);
    expect(isValidFractionalIndex("aA", ...args)).toBe(false);
    expect(isValidFractionalIndex("A99", ...args)).toBe(false);
    expect(isValidFractionalIndex("c99", ...args)).toBe(false);
    expect(isValidFractionalIndex("A000", ...args)).toBe(false);
    expect(isValidFractionalIndex("A0000", ...args)).toBe(false);
    expect(isValidFractionalIndex("a00", ...args)).toBe(false);
    expect(isValidFractionalIndex("C90", ...args)).toBe(false);
    expect(isValidFractionalIndex("a*", ...args)).toBe(false);
    expect(isValidFractionalIndex("a9*", ...args)).toBe(false);

    expect(isValidFractionalIndex("a0", ...args)).toBe(true);
    expect(isValidFractionalIndex("a01", ...args)).toBe(true);
    expect(isValidFractionalIndex("a9", ...args)).toBe(true);
    expect(isValidFractionalIndex("a99", ...args)).toBe(true);
    expect(isValidFractionalIndex("C0", ...args)).toBe(true);
    expect(isValidFractionalIndex("C9", ...args)).toBe(true);
    expect(isValidFractionalIndex("c000", ...args)).toBe(true);
    expect(isValidFractionalIndex("c0001", ...args)).toBe(true);
    expect(isValidFractionalIndex("c999", ...args)).toBe(true);
    expect(isValidFractionalIndex("c9999", ...args)).toBe(true);
    expect(isValidFractionalIndex("A999", ...args)).toBe(true);
    expect(isValidFractionalIndex("A9999", ...args)).toBe(true);
    expect(isValidFractionalIndex("A0001", ...args)).toBe(true);
  });
});

describe("generateKeyBetween", () => {
  const args = [
    DIG_FORWARD,
    DIG_REVERSE,
    LEN_FORWARD,
    LEN_REVERSE,
    MIN_INT,
  ] as const;

  test("basic", () => {
    expect(generateKeyBetween(null, null, ...args)).toBe("a0");
    expect(generateKeyBetween(null, "a0", ...args)).toBe("C9");
    expect(generateKeyBetween("C8", "a0", ...args)).toBe("C9");
    expect(generateKeyBetween("C8999", "a0", ...args)).toBe("C9");
    expect(generateKeyBetween("a0", null, ...args)).toBe("a1");
    expect(generateKeyBetween("a0999", "a2", ...args)).toBe("a1");

    expect(generateKeyBetween("a0", "a1", ...args)).toBe("a05");
    expect(generateKeyBetween("a05", "a1", ...args)).toBe("a07");
    expect(generateKeyBetween("a07", "a1", ...args)).toBe("a08");
    expect(generateKeyBetween("a08", "a1", ...args)).toBe("a09");
    expect(generateKeyBetween("a09", "a1", ...args)).toBe("a095");
    expect(generateKeyBetween("C9", "a0", ...args)).toBe("C95");
    expect(generateKeyBetween("C95", "a0", ...args)).toBe("C97");

    expect(generateKeyBetween(null, "A0001", ...args)).toBe("A00005");
    expect(generateKeyBetween("c999", null, ...args)).toBe("c9995");
    expect(generateKeyBetween("c9999999", null, ...args)).toBe("c99999995");

    for (const invalid of [
      "",
      "*",
      "a",
      "aa",
      "aA",
      "A99",
      "c99",
      "A000",
      "A0000",
      "a00",
      "C90",
    ]) {
      expect(generateKeyBetween(invalid, null, ...args)).toBeUndefined();
      expect(generateKeyBetween(invalid, "a0", ...args)).toBeUndefined();
      expect(generateKeyBetween(null, invalid, ...args)).toBeUndefined();
      expect(generateKeyBetween("a0", invalid, ...args)).toBeUndefined();
      expect(generateKeyBetween(invalid, invalid, ...args)).toBeUndefined();
    }
  });

  test("property", () => {
    for (const min of [
      null,
      "a0",
      "C9",
      "c999",
      "c9999999",
      "A0001",
      "A0009999",
    ]) {
      let b = null;
      for (let i = 0; i < 1000; i++) {
        const result = generateKeyBetween(min, b, ...args);
        if (!result) {
          throw new Error("TEST: Unexpected undefined");
        }
        expect(!b || result < b).toBe(true);
        expect(!min || min < result).toBe(true);
        b = result;
      }
    }

    for (const max of [
      null,
      "a0",
      "C9",
      "c999",
      "c9999999",
      "A0001",
      "A0009999",
    ]) {
      let a = null;
      for (let i = 0; i < 1000; i++) {
        const result = generateKeyBetween(a, max, ...args);
        if (!result) {
          throw new Error("TEST: Unexpected undefined");
        }
        expect(!a || a < result).toBe(true);
        expect(!max || result < max).toBe(true);
        a = result;
      }
    }
  });
});

describe("generateNKeysBetween", () => {
  const args = [
    DIG_FORWARD,
    DIG_REVERSE,
    LEN_FORWARD,
    LEN_REVERSE,
    MIN_INT,
  ] as const;

  const vArgs = [DIG_FORWARD, DIG_REVERSE, LEN_REVERSE, MIN_INT] as const;

  test("basic", () => {
    expect(generateNKeysBetween(null, null, 5, ...args)).toEqual([
      "a0",
      "a1",
      "a2",
      "a3",
      "a4",
    ]);

    expect(generateNKeysBetween("C7", null, 5, ...args)).toEqual([
      "C8",
      "C9",
      "a0",
      "a1",
      "a2",
    ]);

    expect(generateNKeysBetween(null, "a3", 5, ...args)).toEqual([
      "C8",
      "C9",
      "a0",
      "a1",
      "a2",
    ]);

    expect(generateNKeysBetween("C7", "a3", 5, ...args)).toEqual([
      "C72",
      "C75",
      "C8", // Note that it's not "a0", as we don't calculate the half of an integer. This will be always the next integer of a (in this case, "C8").
      "C85",
      "C9",
    ]);

    expect(generateNKeysBetween("C9", "a1", 5, ...args)).toEqual([
      "C92",
      "C95",
      "a0",
      "a02",
      "a05",
    ]);

    expect(generateNKeysBetween("C9", "a0", 5, ...args)).toEqual([
      "C91",
      "C92",
      "C95",
      "C96",
      "C97",
    ]);

    expect(generateNKeysBetween("C9", "a0", 4, ...args)).toEqual([
      "C91",
      "C92",
      "C95",
      "C97",
    ]);

    expect(generateNKeysBetween("a0", "a1", 5, ...args)).toEqual([
      "a01",
      "a02",
      "a05",
      "a06",
      "a07",
    ]);
  });

  test("property", () => {
    // We should use larger number than 2 * (10^3 + 10^2 + 10) = 2220 to ensure that it works correctly even if the integer part is completely filled.
    const keys = generateNKeysBetween(null, null, 10000, ...args);
    if (!keys) {
      throw new Error("TEST: Unexpected undefined");
    }

    expect(isValidFractionalIndex(keys[0], ...vArgs)).toBe(true);

    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1] < keys[i]).toBe(true);
      expect(isValidFractionalIndex(keys[i], ...vArgs)).toBe(true);
    }
  });

  test("property 2", () => {
    const keys: string[] = [];
    for (let i = 0; i < 10000; i++) {
      const operation = Math.floor(Math.random() * 3);
      switch (operation) {
        // append
        case 0: {
          const result = generateKeyBetween(
            keys[keys.length - 1] ?? null,
            null,
            ...args
          );
          if (!result) {
            throw new Error("TEST: Unexpected undefined");
          }
          expect(isValidFractionalIndex(result, ...vArgs)).toBe(true);
          keys.push(result);
          break;
        }

        // prepend
        case 1: {
          const result = generateKeyBetween(null, keys[0] ?? null, ...args);
          if (!result) {
            throw new Error("TEST: Unexpected undefined");
          }
          expect(isValidFractionalIndex(result, ...vArgs)).toBe(true);
          keys.unshift(result);
          break;
        }

        // insert
        case 2: {
          const targetIndex = Math.max(
            Math.floor(Math.random() * (keys.length - 1)),
            0
          );
          const before = keys[targetIndex];
          const after = keys[targetIndex + 1];
          const result = generateKeyBetween(before, after, ...args);
          if (!result) {
            throw new Error("TEST: Unexpected undefined");
          }
          expect(isValidFractionalIndex(result, ...vArgs)).toBe(true);
          keys.splice(targetIndex + 1, 0, result);
          break;
        }
      }
    }

    // check
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1] < keys[i]).toBe(true);
    }
  });
});

describe("avoidConflictSuffix", () => {
  test("basic", () => {
    expect(avoidConflictSuffix(0, DIG_FORWARD)).toBe("");
    expect(avoidConflictSuffix(1, DIG_FORWARD)).toBe("1");
    expect(avoidConflictSuffix(9, DIG_FORWARD)).toBe("9");
    expect(avoidConflictSuffix(10, DIG_FORWARD)).toBe("01");
    expect(avoidConflictSuffix(11, DIG_FORWARD)).toBe("11");
    expect(avoidConflictSuffix(19, DIG_FORWARD)).toBe("91");
    expect(avoidConflictSuffix(20, DIG_FORWARD)).toBe("02");
  });

  test("property", () => {
    for (let i = 0; i < 1000; i++) {
      const result = avoidConflictSuffix(i, DIG_FORWARD);
      // Do not end with "0", as trailing zeros are not allowed in the fractional part.
      expect(result.endsWith("0")).toBe(false);
    }
  });
});

test("What happens if a malicious user tries to generate long key?", () => {
  // 1. [a, b, c] -- First, prepare a, b, and c in this order.
  // 2. [a, c, b] -- Then, move c to between a and b.
  // 3. [a, b, c] -- Then, move b to between a and c.
  // 4. Repeat 2 and 3. This will generate a long key.

  const args = [
    L_DIG_FORWARD,
    L_DIG_REVERSE,
    L_LEN_FORWARD,
    L_LEN_REVERSE,
    L_MIN_INT,
  ] as const;

  let [a, b, c] = generateNKeysBetween(null, null, 3, ...args)!;
  console.log(`Initial lengths (String): ${a.length}, ${b.length}, ${c.length}`);
  for (let i = 0; i < 10000; i++) {
    const nextC = generateKeyBetween(a, b, ...args);
    if (!nextC) {
      throw new Error("TEST: Unexpected undefined");
    }
    expect(nextC < b).toBe(true);
    expect(a < nextC).toBe(true);
    c = nextC;

    const nextB = generateKeyBetween(a, c, ...args);
    if (!nextB) {
      throw new Error("TEST: Unexpected undefined");
    }
    expect(nextB < c).toBe(true);
    expect(a < nextB).toBe(true);
    b = nextB;
  }

  console.log(`Final lengths (String): ${a.length}, ${b.length}, ${c.length}`);

  // There are no effective ways to prevent this attack.
  // The only way is to limit the length of the key.
});
