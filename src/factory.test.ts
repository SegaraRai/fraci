import { describe, expect, it } from "bun:test";
import {
  DEFAULT_MAX_LENGTH,
  createFraciCache,
  fraci,
  fraciBinary,
  fraciString,
} from "./factory.js";

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
      "55002" as any
    );
    expect(() => generator.next()).toThrow("Fraci: Exceeded maximum length");
  });

  it("should throw an error if an invalid input is provided", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxLength: 5,
    });

    const generator1 = indexing.generateKeyBetween("" as any, "550" as any);
    expect(() => generator1.next()).toThrow("Fraci: Invalid indices provided");

    const generator2 = indexing.generateNKeysBetween(
      "550" as any,
      "55a" as any,
      2
    );
    expect(() => generator2.next()).toThrow("Fraci: Invalid indices provided");
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

  it("should stop generation when reached maxRetries", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxRetries: 3,
    });
    const generator = indexing.generateKeyBetween(null, null);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(true);
  });

  it("should stop generation when reached maxRetries (with skip)", () => {
    const indexing = fraci({
      lengthBase,
      digitBase,
      maxRetries: 3,
    });
    const generator = indexing.generateKeyBetween(null, null, 100);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(false);
    expect(generator.next().done).toBe(true);
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
      fraci({ lengthBase, digitBase }, cache)
    );

    // Record cache size after first instance creation
    const sizeBefore = cache.size;
    expect(sizeBefore).toBeGreaterThan(0);

    // Generate a key with the first instance to populate the cache
    const [key1] = indexing1.generateKeyBetween(null, null);

    // Create a second fraci instance with the same cache
    const [indexing2, time2] = measureTime(() =>
      fraci({ lengthBase, digitBase }, cache)
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
        3
      )}ms, second instance: ${time2.toFixed(3)}ms`
    );
  });
});
