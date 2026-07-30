import { describe, expect, it } from "bun:test";
import * as BASES from "./bases.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./lib/utils.js";

describe("BASE constants", () => {
  for (const [name, value] of Object.entries(BASES)) {
    it(`${name} should be valid`, () => {
      expect(() => createDigitBaseMap(value)).not.toThrow();
      expect(() => createIntegerLengthBaseMap(value)).not.toThrow();
    });
  }
});
