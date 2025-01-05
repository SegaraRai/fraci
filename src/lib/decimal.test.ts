import { describe, expect, test } from "bun:test";
import { BASE10, BASE95 } from "../bases.js";
import {
  getIntegerLengthSigned,
  splitParts,
  getIntegerZero,
  getSmallestInteger,
  incrementInteger,
  decrementInteger,
  getMidpointFractional,
} from "./decimal.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./utils.js";

const [LF10, LR10] = createIntegerLengthBaseMap(BASE10);
const [DF10, DR10] = createDigitBaseMap(BASE10);

const [LF95, LR95] = createIntegerLengthBaseMap(BASE95);
const [DF95] = createDigitBaseMap(BASE95);

describe("getIntegerLengthSigned", () => {
  test("BASE10", () => {
    expect(getIntegerLengthSigned("0", LR10)).toBe(-5);
    expect(getIntegerLengthSigned("4", LR10)).toBe(-1);
    expect(getIntegerLengthSigned("5", LR10)).toBe(1);
    expect(getIntegerLengthSigned("9", LR10)).toBe(5);
    expect(getIntegerLengthSigned("9876", LR10)).toBe(5);

    // Invalid
    expect(getIntegerLengthSigned("", LR10)).toBeUndefined();
    expect(getIntegerLengthSigned("a", LR10)).toBeUndefined();
  });

  test("BASE95", () => {
    expect(getIntegerLengthSigned(" ", LR95)).toBe(-47);
    expect(getIntegerLengthSigned("0", LR95)).toBe(-31);
    expect(getIntegerLengthSigned("N", LR95)).toBe(-1);
    expect(getIntegerLengthSigned("O", LR95)).toBe(1);
    expect(getIntegerLengthSigned("~", LR95)).toBe(48);
    expect(getIntegerLengthSigned("~abc", LR95)).toBe(48);

    // Invalid
    expect(getIntegerLengthSigned("", LR95)).toBeUndefined();
    expect(getIntegerLengthSigned("\t", LR95)).toBeUndefined();
  });
});

describe("splitParts", () => {
  test("BASE10", () => {
    expect(splitParts("0123456789", LR10)).toEqual(["012345", "6789"]);
    expect(splitParts("4987654321", LR10)).toEqual(["49", "87654321"]);
    expect(splitParts("5123456789", LR10)).toEqual(["51", "23456789"]);
    expect(splitParts("987654321", LR10)).toEqual(["987654", "321"]);

    expect(splitParts("012345", LR10)).toEqual(["012345", ""]);
    expect(splitParts("49", LR10)).toEqual(["49", ""]);
    expect(splitParts("51", LR10)).toEqual(["51", ""]);
    expect(splitParts("987654", LR10)).toEqual(["987654", ""]);

    // Too short
    expect(splitParts("01234", LR10)).toBeUndefined();
    expect(splitParts("98765", LR10)).toBeUndefined();
    expect(splitParts("4", LR10)).toBeUndefined();
    expect(splitParts("5", LR10)).toBeUndefined();
  });

  test("BASE95", () => {
    expect(
      splitParts(" abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz", LR95)
    ).toEqual([" abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstu", "vwxyz"]);
    expect(
      splitParts("~abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz", LR95)
    ).toEqual(["~abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuv", "wxyz"]);

    expect(
      splitParts(" abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstu", LR95)
    ).toEqual([" abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstu", ""]);
    expect(
      splitParts("~abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuv", LR95)
    ).toEqual(["~abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuv", ""]);

    // Too short
    expect(
      splitParts(" abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrst", LR95)
    ).toBeUndefined();
    expect(
      splitParts("~abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstu", LR95)
    ).toBeUndefined();
  });
});

describe("getIntegerZero", () => {
  test("BASE10", () => {
    expect(getIntegerZero(DF10, LF10)).toBe("50");
  });

  test("BASE95", () => {
    expect(getIntegerZero(DF95, LF95)).toBe("O ");
  });
});

describe("getSmallestInteger", () => {
  test("BASE10", () => {
    expect(getSmallestInteger(DF10, LF10)).toBe("000000");
  });

  test("BASE95", () => {
    expect(getSmallestInteger(DF95, LF95)).toBe(
      "                                                "
    );
  });
});

describe("incrementInteger", () => {
  const ARGS10 = [DF10, DR10, LF10, LR10] as const;

  test("BASE10", () => {
    expect(incrementInteger("000000", ...ARGS10)).toBe("000001");
    expect(incrementInteger("000099", ...ARGS10)).toBe("000100");
    expect(incrementInteger("099999", ...ARGS10)).toBe("10000");
    expect(incrementInteger("399", ...ARGS10)).toBe("40");
    expect(incrementInteger("49", ...ARGS10)).toBe("50");
    expect(incrementInteger("59", ...ARGS10)).toBe("600");
    expect(incrementInteger("900000", ...ARGS10)).toBe("900001");
    expect(incrementInteger("999999", ...ARGS10)).toBe(null);

    // Invalid
    expect(incrementInteger("a12345", ...ARGS10)).toBeUndefined();
    expect(incrementInteger("01234a", ...ARGS10)).toBeUndefined();
  });

  // Base95 is not tested here because the test case is too complicated so that we wouldn't figure out the expected result.
});

describe("decrementInteger", () => {
  const ARGS10 = [DF10, DR10, LF10, LR10] as const;

  test("BASE10", () => {
    expect(decrementInteger("000000", ...ARGS10)).toBe(null);
    expect(decrementInteger("000100", ...ARGS10)).toBe("000099");
    expect(decrementInteger("10000", ...ARGS10)).toBe("099999");
    expect(decrementInteger("40", ...ARGS10)).toBe("399");
    expect(decrementInteger("50", ...ARGS10)).toBe("49");
    expect(decrementInteger("600", ...ARGS10)).toBe("59");
    expect(decrementInteger("900000", ...ARGS10)).toBe("89999");
    expect(decrementInteger("999999", ...ARGS10)).toBe("999998");

    // Invalid
    expect(decrementInteger("a12345", ...ARGS10)).toBeUndefined();
    expect(decrementInteger("01234a", ...ARGS10)).toBeUndefined();
  });

  // Base95 is not tested here because the test case is too complicated so that we wouldn't figure out the expected result.
});

describe("getMidpointFractional", () => {
  test("BASE10", () => {
    expect(getMidpointFractional("0", "9", DF10, DR10)).toBe("4");
    expect(getMidpointFractional("01234", "89876", DF10, DR10)).toBe("4");
    expect(getMidpointFractional("01234", "91234", DF10, DR10)).toBe("4");
    expect(getMidpointFractional("01234", "789", DF10, DR10)).toBe("3");
    expect(getMidpointFractional("4", "6", DF10, DR10)).toBe("5");
    expect(getMidpointFractional("4999999999", "50000001", DF10, DR10)).toBe(
      "5"
    );
    expect(getMidpointFractional("49", "495", DF10, DR10)).toBe("492");
    expect(getMidpointFractional("49", "492", DF10, DR10)).toBe("491");
    expect(getMidpointFractional("49", "491", DF10, DR10)).toBe("4905");
    expect(getMidpointFractional("49", "490001", DF10, DR10)).toBe("4900005");
    expect(getMidpointFractional("5", "51", DF10, DR10)).toBe("505");
    expect(getMidpointFractional("5", "50001", DF10, DR10)).toBe("500005");

    expect(getMidpointFractional("0", null, DF10, DR10)).toBe("5");
    expect(getMidpointFractional("0999", null, DF10, DR10)).toBe("5");
    expect(getMidpointFractional("9", null, DF10, DR10)).toBe("95");
    expect(getMidpointFractional("99", null, DF10, DR10)).toBe("995");
    expect(getMidpointFractional("999998", null, DF10, DR10)).toBe("999999");
    expect(getMidpointFractional("999999", null, DF10, DR10)).toBe("9999995");

    // Invalid
    expect(getMidpointFractional("abc", null, DF10, DR10)).toBeUndefined();
    expect(getMidpointFractional("abc", "123", DF10, DR10)).toBeUndefined();
    expect(getMidpointFractional("123", "abc", DF10, DR10)).toBeUndefined();
    expect(getMidpointFractional("123", "123", DF10, DR10)).toBeUndefined();
    expect(getMidpointFractional("124", "123", DF10, DR10)).toBeUndefined();
    expect(getMidpointFractional("13", "123", DF10, DR10)).toBeUndefined();
  });

  // Base95 is not tested here because the test case is too complicated so that we wouldn't figure out the expected result.
});
