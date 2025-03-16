import { describe, expect, it } from "bun:test";
import { DEFAULT_MAX_LENGTH, createFraciCache, fraci } from "./factory.js";

describe("fraci", () => {
  const digitBase = "0123456789";
  const lengthBase = "0123456789";

  it("should create a fraci instance with default options", () => {
    const indexing = fraci({ digitBase, lengthBase });
    expect(indexing.digitBase).toBe(digitBase);
    expect(indexing.lengthBase).toBe(lengthBase);
  });

  it("should generate a key between two indices", () => {
    const indexing = fraci({ digitBase, lengthBase });
    const generator = indexing.generateKeyBetween(null, null);
    const key = generator.next().value;
    expect(typeof key).toBe("string");
    expect(key!.length).toBeLessThanOrEqual(DEFAULT_MAX_LENGTH);
  });

  it("should generate multiple keys between two indices", () => {
    const indexing = fraci({ digitBase, lengthBase });
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
      digitBase,
      lengthBase,
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
      digitBase,
      lengthBase,
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
      digitBase,
      lengthBase,
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
      digitBase,
      lengthBase,
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
      digitBase,
      lengthBase,
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
  const digitBase = "0123456789";
  const lengthBase = "0123456789";

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
    const indexing = fraci({ digitBase, lengthBase }, cache);

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
      fraci({ digitBase, lengthBase }, cache)
    );

    // Record cache size after first instance creation
    const sizeBefore = cache.size;
    expect(sizeBefore).toBeGreaterThan(0);

    // Generate a key with the first instance to populate the cache
    const [key1] = indexing1.generateKeyBetween(null, null);

    // Create a second fraci instance with the same cache
    const [indexing2, time2] = measureTime(() =>
      fraci({ digitBase, lengthBase }, cache)
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
