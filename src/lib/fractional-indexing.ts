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
 * @throws {Error} When the value is undefined (internal error)
 */
function ensureNotUndefined<T>(value: T | undefined): T {
  if (value === undefined) {
    // This should not happen as we should have validated the value before.
    throw new Error("Fraci Internal: Unexpected undefined");
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
  // Strategy: Handle different cases based on bounds
  if (!a) {
    if (!b) {
      // Case: First key (no bounds)
      return getIntegerZero(digBaseForward, lenBaseForward);
    }

    // Case: Key before first key
    const [bInt, bFrac] = ensureNotUndefined(splitParts(b, lenBaseReverse));
    if (bInt === smallestInteger) {
      // Edge case: b is already at the smallest possible integer
      // We can't decrement the integer part further, so we need to use a fractional part
      // that sorts before b's fractional part
      return `${bInt}${ensureNotUndefined(
        getMidpointFractional("", bFrac, digBaseForward, digBaseReverse)
      )}`;
    }

    if (bFrac) {
      // Optimization: If b has a fractional part, we can use just its integer part
      // This creates a shorter key that still sorts correctly before b
      return bInt;
    }

    // Standard case: Decrement the integer part of b
    const decremented = ensureNotUndefined(
      decrementInteger(
        bInt,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse
      )
    ) as string;

    // Edge case: If we hit the smallest integer, add the largest digit as fractional part
    // This ensures we still have a valid key that sorts before b
    return decremented === smallestInteger
      ? `${decremented}${digBaseForward[digBaseForward.length - 1]}`
      : decremented;
  }

  if (!b) {
    // Case: Key after last key
    const aParts = ensureNotUndefined(splitParts(a, lenBaseReverse));
    const [aInt, aFrac] = aParts;

    // Try to increment the integer part first (most efficient)
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
      // If we can increment the integer part, use that result
      // This creates a shorter key than using fractional parts
      return incremented;
    }

    // Edge case: We've reached the largest possible integer representation
    // We need to use the fractional part method instead
    // Calculate a fractional part that sorts after a's fractional part
    return `${aInt}${ensureNotUndefined(
      getMidpointFractional(aFrac, null, digBaseForward, digBaseReverse)
    )}`;
  }

  // Case: Key between two existing keys
  const aParts = ensureNotUndefined(splitParts(a, lenBaseReverse));
  const bParts = ensureNotUndefined(splitParts(b, lenBaseReverse));
  const [aInt, aFrac] = aParts;
  const [bInt, bFrac] = bParts;

  // If both keys have the same integer part, we need to find a fractional part between them
  if (aInt === bInt) {
    // Calculate the midpoint between the two fractional parts
    return `${aInt}${ensureNotUndefined(
      getMidpointFractional(aFrac, bFrac, digBaseForward, digBaseReverse)
    )}`;
  }

  // Try to increment a's integer part
  const cInt = ensureNotUndefined(
    incrementInteger(
      aInt,
      digBaseForward,
      digBaseReverse,
      lenBaseForward,
      lenBaseReverse
    )
  );

  // Two possible outcomes:
  return cInt !== null && cInt !== bInt
    ? // 1. If incrementing a's integer doesn't reach b's integer,
      // we can use the incremented value (shorter key)
      cInt
    : // 2. If incrementing a's integer equals b's integer or we can't increment,
      // we need to use a's integer with a fractional part that sorts after a's fractional part
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

  // Special case: Generate n keys after a (no upper bound)
  if (b == null) {
    let c = a;
    // Sequential generation - each new key is after the previous one
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(c, b, ...args))
    );
  }

  // Special case: Generate n keys before b (no lower bound)
  if (a == null) {
    let c = b;
    // Sequential generation in reverse - each new key is before the previous one
    // Then reverse the array to get ascending order
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(a, c, ...args))
    ).reverse();
  }

  // Divide-and-conquer approach for better distribution of keys
  const mid = n >> 1; // Fast integer division by 2

  // Find a midpoint key between a and b
  const c = generateKeyBetweenUnsafe(a, b, ...args);

  // Recursively generate keys in both halves and combine them
  // This creates a more balanced distribution than sequential generation
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
  // Use the digit base length as the radix for conversion
  const radix = digBaseForward.length;
  let additionalFrac = "";

  // Convert a number to a string representation using our custom digit base
  // This works like converting to a different number base (like base-10 or base-16),
  // but we write the digits in reverse order.
  //
  // For example, with digit base "0123456789":
  // - The number 3 would become "3"
  // - The number 10 would become "01"
  // - The number 1234 would become "4321"
  //
  // We do this reversed ordering to ensure the string doesn't end with zeros,
  // which we need to avoid in fractional indices.
  while (count > 0) {
    // Add the digit for the current remainder
    additionalFrac += digBaseForward[count % radix];
    // Integer division to get the next digit
    count = Math.floor(count / radix);
  }

  // The result is a unique suffix for each count value
  return additionalFrac;
}
