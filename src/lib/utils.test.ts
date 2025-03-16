import { describe, expect, it } from "bun:test";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./utils.js";

describe("createDigitBaseMap", () => {
  it("should create a valid digit base map", () => {
    const base = "abcd";
    const [forward, reverse] = createDigitBaseMap(base);
    expect(forward).toEqual(["a", "b", "c", "d"]);
    expect(reverse.get("a")).toBe(0);
    expect(reverse.get("b")).toBe(1);
    expect(reverse.get("c")).toBe(2);
    expect(reverse.get("d")).toBe(3);
  });

  it("should create a valid digit base map (odd)", () => {
    const base = "abcdefg";
    const [forward, reverse] = createDigitBaseMap(base);
    expect(forward).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(reverse.get("a")).toBe(0);
    expect(reverse.get("b")).toBe(1);
    expect(reverse.get("c")).toBe(2);
    expect(reverse.get("d")).toBe(3);
    expect(reverse.get("e")).toBe(4);
    expect(reverse.get("f")).toBe(5);
    expect(reverse.get("g")).toBe(6);
  });

  it("should throw an error if the base string is too short", () => {
    const base = "abc";
    expect(() => createDigitBaseMap(base)).toThrow(
      "Fraci: Base string must have at least 4 unique characters"
    );
  });

  it("should throw an error if the base string has duplicated characters", () => {
    const base = "aabc";
    expect(() => createDigitBaseMap(base)).toThrow(
      "Fraci: Base string characters must be unique and in ascending order"
    );
  });

  it("should throw an error if the base string characters are not in ascending order", () => {
    const base = "abdc";
    expect(() => createDigitBaseMap(base)).toThrow(
      "Fraci: Base string characters must be unique and in ascending order"
    );
  });
});

describe("createIntegerLengthBaseMap", () => {
  it("should create a valid integer length base map", () => {
    const base = "abcd";
    const [forward, reverse] = createIntegerLengthBaseMap(base);
    expect(forward.get(-2)).toBe("a");
    expect(forward.get(-1)).toBe("b");
    expect(forward.get(1)).toBe("c");
    expect(forward.get(2)).toBe("d");
    expect(reverse.get("a")).toBe(-2);
    expect(reverse.get("b")).toBe(-1);
    expect(reverse.get("c")).toBe(1);
    expect(reverse.get("d")).toBe(2);
  });

  it("should create a valid integer length base map (odd)", () => {
    const base = "abcdefg";
    const [forward, reverse] = createIntegerLengthBaseMap(base);
    expect(forward.get(-3)).toBe("a");
    expect(forward.get(-2)).toBe("b");
    expect(forward.get(-1)).toBe("c");
    expect(forward.get(1)).toBe("d");
    expect(forward.get(2)).toBe("e");
    expect(forward.get(3)).toBe("f");
    expect(forward.get(4)).toBe("g");
    expect(reverse.get("a")).toBe(-3);
    expect(reverse.get("b")).toBe(-2);
    expect(reverse.get("c")).toBe(-1);
    expect(reverse.get("d")).toBe(1);
    expect(reverse.get("e")).toBe(2);
    expect(reverse.get("f")).toBe(3);
    expect(reverse.get("g")).toBe(4);
  });

  it("should throw an error if the base string is too short", () => {
    const base = "abc";
    expect(() => createIntegerLengthBaseMap(base)).toThrow(
      "Fraci: Base string must have at least 4 unique characters"
    );
  });

  it("should throw an error if the base string has duplicated characters", () => {
    const base = "aabc";
    expect(() => createIntegerLengthBaseMap(base)).toThrow(
      "Fraci: Base string characters must be unique and in ascending order"
    );
  });

  it("should throw an error if the base string characters are not in ascending order", () => {
    const base = "abdc";
    expect(() => createIntegerLengthBaseMap(base)).toThrow(
      "Fraci: Base string characters must be unique and in ascending order"
    );
  });
});
