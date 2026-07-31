import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_MAX_LENGTH,
  MAX_GENERATED_KEYS,
  createFraciCache,
  fraci,
  fraciBinary,
  fraciString,
} from "./factory.js";
import type { FractionalIndexOf } from "./types.js";

function compareBinary(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const difference = a[i] - b[i];
    if (difference !== 0) {
      return difference;
    }
  }
  return a.length - b.length;
}

describe("fraciBinary", () => {
  it("should create a binary fractional indexing utility", () => {
    const indexing = fraciBinary();
    expect(indexing.base).toEqual({ type: "binary" });

    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;
    expect(key instanceof Uint8Array).toBe(true);
  });

  it("should accept a brand parameter", () => {
    const indexing = fraciBinary({ brand: "myBrand" });
    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;

    // Ensure key is not undefined before using it
    expect(key).toBeDefined();

    // The key should work with the same indexing instance
    const nextGenerator = indexing.generateKeyBetween(key!, null);
    expect(nextGenerator.next().value instanceof Uint8Array).toBe(true);
  });

  it("should enforce type compatibility", () => {
    // @ts-expect-error - Should not accept lengthBase
    fraciBinary({ lengthBase: "0123456789" });

    // @ts-expect-error - Should not accept digitBase
    fraciBinary({ digitBase: "0123456789" });

    // @ts-expect-error - Should not accept type: "string"
    fraciBinary({ type: "string" });

    // @ts-expect-error - Should not accept type: "invalid"
    fraciBinary({ type: "invalid" });

    // Should accept type: "binary" explicitly
    fraciBinary({ type: "binary" });

    // Should accept without type (defaults to binary)
    fraciBinary({});
  });

  it("should not allow mixing brands", () => {
    const indexing1 = fraciBinary({ brand: "brand1" });
    const indexing2 = fraciBinary({ brand: "brand2" });

    const key1 = indexing1.generateKeyBetween(null, null).next().value;
    const key2 = indexing2.generateKeyBetween(null, null).next().value;

    // @ts-expect-error - Should not allow using key1 with indexing2
    indexing2.generateKeyBetween(key1, null);

    // @ts-expect-error - Should not allow using key2 with indexing1
    indexing1.generateKeyBetween(key2, null);
  });

  it.each([
    ["maxLength", { maxLength: 0 }],
    ["maxLength", { maxLength: Number.NaN }],
    ["maxRetries", { maxRetries: 0 }],
    ["maxRetries", { maxRetries: 1.5 }],
  ] as const)("should reject invalid %s", (_, options) => {
    expect(() => fraciBinary(options)).toThrowError(
      expect.objectContaining({ code: "INVALID_ARGUMENT" }),
    );
  });

  it("should support safe integer skip values", () => {
    const indexing = fraciBinary({ maxRetries: 1 });
    const key = indexing.generateKeyBetween(null, null, 2 ** 31).next().value;

    expect(key).toBeDefined();
    expect(() => indexing.generateKeyBetween(key!, null).next()).not.toThrow();
  });

  it("keeps every retry candidate inside the requested interval", () => {
    const indexing = fraciBinary({ maxRetries: 5 });
    const lower = new Uint8Array([128, 0, 4]) as any;
    const upper = new Uint8Array([128, 0, 5, 1]) as any;
    const generator = indexing.generateKeyBetween(lower, upper);
    const candidates = Array.from({ length: 5 }, () => generator.next().value!);

    expect(
      new Set(candidates.map((value) => Array.from(value).join(","))).size,
    ).toBe(5);
    expect(candidates).toEqual(
      [...candidates].sort((a, b) => compareBinary(a, b)),
    );
    for (const candidate of candidates) {
      expect(compareBinary(lower, candidate)).toBeLessThan(0);
      expect(compareBinary(candidate, upper)).toBeLessThan(0);
    }
  });
});

describe("fraciString", () => {
  const lengthBase = "0123456789";
  const digitBase = "0123456789";

  it("should create a string fractional indexing utility", () => {
    const indexing = fraciString({ lengthBase, digitBase });
    // The base is cast to the correct type but is initially an array
    expect(indexing.base).toEqual({
      type: "string",
      lengthBase,
      digitBase,
    });

    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;
    expect(typeof key).toBe("string");
  });

  it("should accept a brand parameter", () => {
    const indexing = fraciString({
      brand: "myBrand",
      lengthBase,
      digitBase,
    });

    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;

    // Ensure key is not undefined before using it
    expect(key).toBeDefined();

    // The key should work with the same indexing instance
    const nextGenerator = indexing.generateKeyBetween(key!, null);
    expect(typeof nextGenerator.next().value).toBe("string");
  });

  it("should enforce type compatibility", () => {
    // @ts-expect-error - Should require lengthBase
    expect(() => fraciString({ digitBase })).toThrow();

    // @ts-expect-error - Should require digitBase
    expect(() => fraciString({ lengthBase })).toThrow();

    // @ts-expect-error - Should not accept type: "invalid"
    fraciString({ lengthBase, digitBase, type: "invalid" });

    // @ts-expect-error - Should not accept type: "binary"
    const indexing = fraciString({ lengthBase, digitBase, type: "binary" });
    // Verify it's still a string indexing despite the binary type
    const key = indexing.generateKeyBetween(null, null).next().value;
    expect(typeof key).toBe("string");

    // Should accept type: "string" explicitly
    fraciString({ lengthBase, digitBase, type: "string" });

    // Should accept without type (defaults to string)
    fraciString({ lengthBase, digitBase });
  });

  it("should not allow mixing brands", () => {
    const indexing1 = fraciString({
      brand: "brand1",
      lengthBase,
      digitBase,
    });

    const indexing2 = fraciString({
      brand: "brand2",
      lengthBase,
      digitBase,
    });

    const key1 = indexing1.generateKeyBetween(null, null).next().value;
    const key2 = indexing2.generateKeyBetween(null, null).next().value;

    // @ts-expect-error - Should not allow using key1 with indexing2
    indexing2.generateKeyBetween(key1, null);

    // @ts-expect-error - Should not allow using key2 with indexing1
    indexing1.generateKeyBetween(key2, null);
  });

  it("should not allow mixing binary and string indices", () => {
    const binaryIndexing = fraciBinary();
    const stringIndexing = fraciString({ lengthBase, digitBase });

    const binaryKey = binaryIndexing
      .generateKeyBetween(null, null)
      .next().value;
    const stringKey = stringIndexing
      .generateKeyBetween(null, null)
      .next().value;

    // @ts-expect-error - Should not allow using binary key with string indexing
    stringIndexing.generateKeyBetween(binaryKey, null);

    // @ts-expect-error - Should not allow using string key with binary indexing
    binaryIndexing.generateKeyBetween(stringKey, null);
  });

  it("keeps single and batch retry candidates ordered inside the interval", () => {
    const indexing = fraciString({
      lengthBase,
      digitBase,
      maxRetries: 5,
    });
    const lower = "504" as any;
    const upper = "5051" as any;

    const singleGenerator = indexing.generateKeyBetween(lower, upper);
    const candidates = Array.from(
      { length: 5 },
      () => singleGenerator.next().value!,
    );
    expect(new Set(candidates).size).toBe(5);
    expect(candidates).toEqual([...candidates].sort());
    for (const candidate of candidates) {
      expect(lower < candidate && candidate < upper).toBe(true);
    }

    const batchGenerator = indexing.generateNKeysBetween(lower, upper, 3);
    const batches = Array.from(
      { length: 5 },
      () => batchGenerator.next().value!,
    );
    const flattened = batches.flat();
    expect(new Set(flattened).size).toBe(flattened.length);
    for (const batch of batches) {
      expect(batch).toEqual([...batch].sort());
      expect(batch.every((value) => lower < value && value < upper)).toBe(true);
    }
    for (let position = 0; position < batches[0].length; position++) {
      const retriesAtPosition = batches.map((batch) => batch[position]);
      expect(retriesAtPosition).toEqual([...retriesAtPosition].sort());
    }
  });
});

describe("fraci", () => {
  const lengthBase = "0123456789";
  const digitBase = "0123456789";

  it("should generate a key between two indices", () => {
    const indexing = fraci({ lengthBase, digitBase });
    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;
    expect(typeof key).toBe("string");
    expect(key!.length).toBeLessThanOrEqual(DEFAULT_MAX_LENGTH);
  });

  it("should generate multiple keys between two indices", () => {
    const indexing = fraci({ lengthBase, digitBase });
    const generator = indexing.generateNKeysBetween(null, null, 5);
    const keys = generator.next().value;
    expect(Array.isArray(keys)).toBe(true);
    expect(keys!.length).toBe(5);
    keys!.forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeLessThanOrEqual(DEFAULT_MAX_LENGTH);
    });
  });

  it("should throw an error if maximum length is exceeded", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxLength: 5,
    });
    const generator = indexing.generateKeyBetween(
      "55001" as any,
      "55002" as any,
    );
    expect(() => generator.next()).toThrow("Exceeded maximum length");
  });

  it("should throw an error if an invalid input is provided", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxLength: 5,
    });

    const generator1 = indexing.generateKeyBetween("" as any, "550" as any);
    expect(() => generator1.next()).toThrow("Invalid indices provided");

    const generator2 = indexing.generateNKeysBetween(
      "550" as any,
      "55a" as any,
      2,
    );
    expect(() => generator2.next()).toThrow("Invalid indices provided");
  });

  it("should handle skip parameter", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxRetries: 10,
    });
    const generator1 = indexing.generateKeyBetween(null, null, 0);
    const generator2 = indexing.generateKeyBetween(null, null, 2);
    generator1.next();
    generator1.next();
    expect(generator1.next().value).toBe(generator2.next().value);
    expect(generator1.next().value).toBe(generator2.next().value);
    expect(generator1.next().value).toBe(generator2.next().value);
    expect(generator1.next().value).not.toBeUndefined();
    expect(generator2.next().value).not.toBeUndefined();
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "should reject invalid skip value %s",
    (skip) => {
      const indexing = fraci({ lengthBase, digitBase });
      expect(() =>
        indexing.generateKeyBetween(null, null, skip).next(),
      ).toThrowError(expect.objectContaining({ code: "INVALID_ARGUMENT" }));
    },
  );

  it("rejects impractically large generation counts before allocation", () => {
    const indexing = fraci({ lengthBase, digitBase });
    expect(() =>
      indexing.generateNKeysBetween(null, null, MAX_GENERATED_KEYS + 1).next(),
    ).toThrowError(expect.objectContaining({ code: "INVALID_ARGUMENT" }));
  });

  it("rejects oversized input before midpoint computation", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxLength: 50,
    });
    const oversized = `999999${"9".repeat(20_000)}` as any;
    expect(() =>
      indexing.generateKeyBetween(oversized, null).next(),
    ).toThrowError(expect.objectContaining({ code: "MAX_LENGTH_EXCEEDED" }));
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "should reject invalid key count %s",
    (n) => {
      const indexing = fraci({ lengthBase, digitBase });
      expect(() =>
        indexing.generateNKeysBetween(null, null, n).next(),
      ).toThrowError(expect.objectContaining({ code: "INVALID_ARGUMENT" }));
    },
  );

  it("should throw an error if reached maxRetries", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxRetries: 3,
    });
    const generator = indexing.generateKeyBetween(null, null);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(() => generator.next()).toThrow("Exceeded maximum retries");
  });

  it("should throw an error if reached maxRetries (with skip)", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxRetries: 3,
    });
    const generator = indexing.generateKeyBetween(null, null, 100);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(() => generator.next()).toThrow("Exceeded maximum retries");
  });

  it("should handle complex tuple types", () => {
    const indexing = fraci({ lengthBase, digitBase });

    type FI = FractionalIndexOf<typeof indexing>;
    const indices = [null, null] as
      | [FI, FI | null]
      | [FI | null, null]
      | [null, null];
    indexing.generateKeyBetween(...indices);
    indexing.generateKeyBetween(...indices, 1);
    indexing.generateNKeysBetween(...indices, 3);
    indexing.generateNKeysBetween(...indices, 3, 1);

    // @ts-expect-error - Should not accept if n is missing
    indexing.generateNKeysBetween(...indices);

    expect(true).toBe(true);
  });
});

describe("createFraciCache", () => {
  const lengthBase = "0123456789";
  const digitBase = "0123456789";

  const measureTime = <T>(fn: () => T): [T, number] => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    return [result, end - start];
  };

  it("should create an empty Map instance", () => {
    const cache = createFraciCache();
    expect(cache).toBeInstanceOf(Map);
    expect(cache.size).toBe(0);
  });

  it("should be usable with fraci function", () => {
    const cache = createFraciCache();

    // Create a fraci instance with a cache
    const indexing = fraci({ lengthBase, digitBase }, cache);

    // Cache should now contain entries
    expect(cache.size).toBeGreaterThan(0);

    // Generate a key
    const generator = indexing.generateKeyBetween(null, null);
    const [key] = generator;

    expect(typeof key).toBe("string");
  });

  it("should share cached computations between multiple fraci instances", () => {
    const cache = createFraciCache();

    // Create a first fraci instance with a cache
    const [indexing1, time1] = measureTime(() =>
      fraci({ lengthBase, digitBase }, cache),
    );

    // Record cache size after first instance creation
    const sizeBefore = cache.size;
    expect(sizeBefore).toBeGreaterThan(0);

    // Generate a key with the first instance to populate the cache
    const [key1] = indexing1.generateKeyBetween(null, null);

    // Create a second fraci instance with the same cache
    const [indexing2, time2] = measureTime(() =>
      fraci({ lengthBase, digitBase }, cache),
    );

    // Cache size should remain the same since computations are shared
    expect(cache.size).toBe(sizeBefore);

    // Generate a key with the second instance
    const [key2] = indexing2.generateKeyBetween(null, null);

    // Keys should be the same since they share the same cache
    expect(key1).toBe(key2);

    // Log performance results
    console.log(
      `Time to create first instance: ${time1.toFixed(
        3,
      )}ms, second instance: ${time2.toFixed(3)}ms`,
    );
  });
});
