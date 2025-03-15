import {
  decrementInteger,
  getIntegerZero,
  getMidpointFractional,
  incrementInteger,
  splitParts,
} from "./decimal.js";

/**
 * Validates if a string is a valid fractional index.
 * A valid fractional index must:
 * - Not be empty or equal to the smallest integer
 * - Have a valid integer part with valid digits
 * - Not have trailing zeros in the fractional part
 * - Contain only valid digits in both integer and fractional parts
 *
 * @param index - The string to validate as a fractional index
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @param smallestInteger - The smallest possible integer representation
 * @returns True if the string is a valid fractional index, false otherwise
 */
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

/**
 * Ensures a value is not undefined, throwing an error if it is.
 * This is a utility function used to handle unexpected undefined values
 * that should have been validated earlier in the code.
 *
 * @param value - The value to check
 * @returns The original value if it's not undefined
 * @throws Error if the value is undefined
 */
function ensureNotUndefined<T>(value: T | undefined): T {
  if (value === undefined) {
    // This should not happen as we should have validated the value before.
    throw new Error("Unexpected undefined.");
  }
  return value;
}

/**
 * Generates a key between two existing keys without validation.
 * This internal function handles the core algorithm for creating a fractional index
 * between two existing indices. It assumes inputs are valid and doesn't perform validation.
 *
 * The function handles several cases:
 * - When both a and b are null (first key)
 * - When only a is null (key before b)
 * - When only b is null (key after a)
 * - When both a and b are provided (key between a and b)
 *
 * @param a - The lower bound key, or null if there is no lower bound
 * @param b - The upper bound key, or null if there is no upper bound
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseForward - Map of length values to their encoding characters
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @param smallestInteger - The smallest possible integer representation
 * @returns A new key that sorts between a and b
 */
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

/**
 * Generates a key between two existing keys with validation.
 * This function validates the input keys before generating a new key between them.
 * It returns undefined if either key is invalid or if b is less than or equal to a.
 *
 * @param a - The lower bound key, or null if there is no lower bound
 * @param b - The upper bound key, or null if there is no upper bound
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseForward - Map of length values to their encoding characters
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @param smallestInteger - The smallest possible integer representation
 * @returns A new key that sorts between a and b, or undefined if inputs are invalid
 */
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

/**
 * Generates multiple keys between two existing keys without validation.
 * This internal function creates n evenly distributed keys between a and b.
 * It uses a recursive divide-and-conquer approach for more even distribution.
 *
 * The function handles several cases:
 * - When n < 1 (returns empty array)
 * - When n = 1 (returns a single key between a and b)
 * - When b is null (generates n keys after a)
 * - When a is null (generates n keys before b)
 * - When both a and b are provided (generates n keys between a and b)
 *
 * @param a - The lower bound key, or null if there is no lower bound
 * @param b - The upper bound key, or null if there is no upper bound
 * @param n - Number of keys to generate
 * @param args - Array containing the base maps and smallest integer value
 * @returns An array of n new keys that sort between a and b
 */
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

/**
 * Generates multiple keys between two existing keys with validation.
 * This function validates the input keys before generating new keys between them.
 * It returns undefined if either key is invalid or if b is less than or equal to a.
 *
 * @param a - The lower bound key, or null if there is no lower bound
 * @param b - The upper bound key, or null if there is no upper bound
 * @param n - Number of keys to generate
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseForward - Map of length values to their encoding characters
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @param smallestInteger - The smallest possible integer representation
 * @returns An array of n new keys that sort between a and b, or undefined if inputs are invalid
 */
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

/**
 * Generates a suffix to avoid conflicts between fractional indices.
 * This function creates a unique suffix based on the count value,
 * converting it to the specified digit base. The suffix is used to
 * ensure uniqueness when multiple indices need to be generated between
 * the same bounds.
 *
 * @param count - The count value to convert to a suffix
 * @param digBaseForward - Array mapping digit positions to characters
 * @returns A string suffix in the specified digit base
 */
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
