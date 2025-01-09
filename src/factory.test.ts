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

  it("should stop generation when reached maxRetries", () => {
    const indexing = fraci({
      digitBase,
      lengthBase,
      maxRetries: 3,
    });
    const generator = indexing.generateKeyBetween(null, null);
    generator.next();
    generator.next();
    generator.next();
    expect(generator.next().done).toBe(true);
  });
});
