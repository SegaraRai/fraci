import { bench, run } from "mitata";
import { BASE95 } from "../bases.js";
import { getSmallestInteger } from "./decimal-string.js";
import {
  generateKeyBetween,
  generateNKeysBetween,
} from "./fractional-indexing-string.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./utils.js";

const [L_LEN_FORWARD, L_LEN_REVERSE] = createIntegerLengthBaseMap(BASE95);
const [L_DIG_FORWARD, L_DIG_REVERSE] = createDigitBaseMap(BASE95);
const L_MIN_INT = getSmallestInteger(L_DIG_FORWARD, L_LEN_FORWARD);

const args = [
  L_DIG_FORWARD,
  L_DIG_REVERSE,
  L_LEN_FORWARD,
  L_LEN_REVERSE,
  L_MIN_INT,
] as const;

bench("append keys x10000", () => {
  let [a] = generateNKeysBetween(null, null, 2, ...args)!;
  for (let i = 0; i < 10000; i++) {
    const nextA = generateKeyBetween(a, null, ...args);
    if (!nextA) {
      throw new Error("BENCH: Unexpected undefined");
    }
    a = nextA;
  }
});

bench("prepend keys x10000", () => {
  let [b] = generateNKeysBetween(null, null, 2, ...args)!;
  for (let i = 0; i < 10000; i++) {
    const nextB = generateKeyBetween(null, b, ...args);
    if (!nextB) {
      throw new Error("BENCH: Unexpected undefined");
    }
    b = nextB;
  }
});

bench("generate middle keys x10000", () => {
  let [a, b, c] = generateNKeysBetween(null, null, 3, ...args)!;
  for (let i = 0; i < 5000; i++) {
    const nextC = generateKeyBetween(a, b, ...args);
    if (!nextC) {
      throw new Error("BENCH: Unexpected undefined");
    }
    c = nextC;

    const nextB = generateKeyBetween(a, c, ...args);
    if (!nextB) {
      throw new Error("BENCH: Unexpected undefined");
    }
    b = nextB;
  }
});

bench("random operations x10000", () => {
  const keys: string[] = [];
  for (let i = 0; i < 10000; i++) {
    const operation = Math.floor(Math.random() * 3);
    switch (operation) {
      // append
      case 0: {
        const result = generateKeyBetween(
          keys[keys.length - 1] ?? null,
          null,
          ...args,
        );
        if (!result) {
          throw new Error("BENCH: Unexpected undefined");
        }
        keys.push(result);
        break;
      }

      // prepend
      case 1: {
        const result = generateKeyBetween(null, keys[0] ?? null, ...args);
        if (!result) {
          throw new Error("BENCH: Unexpected undefined");
        }
        keys.unshift(result);
        break;
      }

      // insert
      case 2: {
        const targetIndex = Math.max(
          Math.floor(Math.random() * (keys.length - 1)),
          0,
        );
        const before = keys[targetIndex] ?? null;
        const after = keys[targetIndex + 1] ?? null;
        const result = generateKeyBetween(before, after, ...args);
        if (!result) {
          throw new Error("BENCH: Unexpected undefined");
        }
        keys.splice(targetIndex + 1, 0, result);
        break;
      }
    }
  }
}).gc("inner");

bench("random operations 2 x10000", () => {
  const keys: string[] = [];
  for (let i = 0; i < 10000; i++) {
    const targetIndex = Math.max(
      Math.floor(Math.random() * (keys.length - 1)),
      0,
    );
    const before = keys[targetIndex] ?? null;
    const after = keys[targetIndex + 1] ?? null;
    const result = generateKeyBetween(before, after, ...args);
    if (!result) {
      throw new Error("BENCH: Unexpected undefined");
    }
    keys.splice(targetIndex + 1, 0, result);
  }
}).gc("inner");

await run();
