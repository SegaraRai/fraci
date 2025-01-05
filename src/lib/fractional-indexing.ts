import {
  getIntegerZero,
  splitParts,
  getMidpointFractional,
  decrementInteger,
  incrementInteger,
} from "./decimal.js";

export function isValidFractionalIndex(
  index: string,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseReverse: ReadonlyMap<string, number>,
  smallestInteger: string
): boolean {
  if (!index || index === smallestInteger) {
    // The smallest integer is not a valid fractional index. It must have a fractional part.
    return false;
  }

  const parts = splitParts(index, lenBaseReverse);
  if (!parts) {
    // Invalid integer length character or the integer part is too short.
    return false;
  }

  const [integer, fractional] = parts;
  if (fractional.endsWith(digBaseForward[0])) {
    // Trailing zeros are not allowed in the fractional part.
    return false;
  }

  for (const char of integer.slice(1)) {
    if (!digBaseReverse.has(char)) {
      return false;
    }
  }

  for (const char of fractional) {
    if (!digBaseReverse.has(char)) {
      return false;
    }
  }

  return true;
}

function ensureNotUndefined<T>(value: T | undefined): T {
  if (value === undefined) {
    // This should not happen as we should have validated the value before.
    throw new Error("Unexpected undefined.");
  }
  return value;
}

function generateKeyBetweenUnsafe(
  a: string | null,
  b: string | null,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>,
  smallestInteger: string
): string {
  if (!a) {
    if (!b) {
      // a == null, b == null
      return getIntegerZero(digBaseForward, lenBaseForward);
    }

    // a == null, b != null
    const [bInt, bFrac] = ensureNotUndefined(splitParts(b, lenBaseReverse));
    if (bInt === smallestInteger) {
      // As bInt is the smallest integer, we have to decrease fractional part.
      // At this time, although it is more space efficient to treat the decimal part as a fixed length, it is not adopted for the following reasons.
      // - There is a limit when treating the decimal part as a fixed length.
      // - In the first place, the algorithm for the integer part is in charge of the space-efficient method.
      // This is a handling for edge cases that is extremely impractical in a correctly created application.
      return `${bInt}${ensureNotUndefined(
        getMidpointFractional("", bFrac, digBaseForward, digBaseReverse)
      )}`;
    }

    if (bFrac) {
      // If b has a fractional part, just remove it.
      return bInt;
    }

    const decremented = ensureNotUndefined(
      decrementInteger(
        bInt,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse
      )
    ) as string;
    return decremented === smallestInteger
      ? `${decremented}${digBaseForward[digBaseForward.length - 1]}`
      : decremented;
  }

  if (!b) {
    // a != null, b == null
    const aParts = ensureNotUndefined(splitParts(a, lenBaseReverse));
    const [aInt, aFrac] = aParts;
    const incremented = ensureNotUndefined(
      incrementInteger(
        aInt,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse
      )
    );
    if (incremented !== null) {
      // aInt is invalid (if incremented === undefined), or aInt is not the largest integer.
      return incremented;
    }

    // As aInt is the largest integer, we have to increase fractional part.
    // At this time, although it is more space efficient to treat the decimal part as a fixed length, it is not adopted for the following reasons.
    // - There is a limit when treating the decimal part as a fixed length.
    // - In the first place, the algorithm for the integer part is in charge of the space-efficient method.
    // This is a handling for edge cases that is extremely impractical in a correctly created application.
    return `${aInt}${ensureNotUndefined(
      getMidpointFractional(aFrac, null, digBaseForward, digBaseReverse)
    )}`;
  }

  // a != null, b != null
  const aParts = ensureNotUndefined(splitParts(a, lenBaseReverse));
  const bParts = ensureNotUndefined(splitParts(b, lenBaseReverse));
  const [aInt, aFrac] = aParts;
  const [bInt, bFrac] = bParts;
  if (aInt === bInt) {
    return `${aInt}${ensureNotUndefined(
      getMidpointFractional(aFrac, bFrac, digBaseForward, digBaseReverse)
    )}`;
  }

  const cInt = ensureNotUndefined(
    incrementInteger(
      aInt,
      digBaseForward,
      digBaseReverse,
      lenBaseForward,
      lenBaseReverse
    )
  );

  return cInt !== null && cInt !== bInt
    ? // aInt is invalid (if cInt is undefined), or $ cInt = aInt + 1 (< bInt) $.
      cInt
    : // $ cInt = aInt + 1 = bInt $. Return $ aInt + (.0 + aFrac) / 2 $.
      `${aInt}${ensureNotUndefined(
        getMidpointFractional(aFrac, null, digBaseForward, digBaseReverse)
      )}`;
}

export function generateKeyBetween(
  a: string | null,
  b: string | null,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>,
  smallestInteger: string
): string | undefined {
  return (a != null &&
    !isValidFractionalIndex(
      a,
      digBaseForward,
      digBaseReverse,
      lenBaseReverse,
      smallestInteger
    )) ||
    (b != null &&
      !isValidFractionalIndex(
        b,
        digBaseForward,
        digBaseReverse,
        lenBaseReverse,
        smallestInteger
      )) ||
    (a != null && b != null && b <= a)
    ? undefined
    : generateKeyBetweenUnsafe(
        a,
        b,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse,
        smallestInteger
      );
}

function generateNKeysBetweenUnsafe(
  a: string | null,
  b: string | null,
  n: number,
  ...args: [
    readonly string[],
    ReadonlyMap<string, number>,
    ReadonlyMap<number, string>,
    ReadonlyMap<string, number>,
    string
  ]
): string[] {
  if (n < 1) {
    return [];
  }

  if (n === 1) {
    return [generateKeyBetweenUnsafe(a, b, ...args)];
  }

  if (b == null) {
    let c = a;
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(c, b, ...args))
    );
  }

  if (a == null) {
    let c = b;
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(a, c, ...args))
    ).reverse();
  }

  const mid = n >> 1;
  const c = generateKeyBetweenUnsafe(a, b, ...args);
  return [
    ...generateNKeysBetweenUnsafe(a, c, mid, ...args),
    c,
    ...generateNKeysBetweenUnsafe(c, b, n - mid - 1, ...args),
  ];
}

export function generateNKeysBetween(
  a: string | null,
  b: string | null,
  n: number,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>,
  smallestInteger: string
): string[] | undefined {
  return (a != null &&
    !isValidFractionalIndex(
      a,
      digBaseForward,
      digBaseReverse,
      lenBaseReverse,
      smallestInteger
    )) ||
    (b != null &&
      !isValidFractionalIndex(
        b,
        digBaseForward,
        digBaseReverse,
        lenBaseReverse,
        smallestInteger
      )) ||
    (a != null && b != null && b <= a)
    ? undefined
    : generateNKeysBetweenUnsafe(
        a,
        b,
        n,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse,
        smallestInteger
      );
}

export function avoidConflictSuffix(
  count: number,
  digBaseForward: readonly string[]
): string {
  const radix = digBaseForward.length;
  let additionalFrac = "";
  while (count > 0) {
    additionalFrac += digBaseForward[count % radix];
    count = Math.floor(count / radix);
  }
  return additionalFrac;
}
