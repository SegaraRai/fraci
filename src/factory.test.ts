import { describe, expect, it } from "bun:test";
import { DEFAULT_MAX_LENGTH, fraci } from "./factory.js";

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
    expect(() => generator.next()).toThrow("Exceeded maximum length");
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
