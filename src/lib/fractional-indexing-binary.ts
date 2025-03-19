import {
  INTEGER_ZERO,
  compare,
  concat,
  decrementInteger,
  getMidpointFractional,
  incrementInteger,
  isSmallestInteger,
  splitParts,
} from "./decimal-binary.js";

/**
 * Converts a Node.js Buffer to a Uint8Array if necessary.
 * Our library is not compatible with Node.js Buffers due to [the difference of the `slice` method](https://nodejs.org/api/buffer.html#bufslicestart-end).
 *
 * @param value - The value to convert to a Uint8Array
 * @returns The original value as a Uint8Array, or null if the value is null
 */
function forceUint8Array(value: Uint8Array | null): Uint8Array | null {
  return value?.constructor.name === "Buffer"
    ? new Uint8Array(value.buffer, value.byteOffset, value.length)
    : value;
}

/**
 * Validates if a binary is a valid fractional index.
 * A valid fractional index must:
 * - Not be empty or equal to the smallest integer
 * - Have a valid integer part with valid digits
 * - Not have trailing zeros in the fractional part
 * - Contain only valid digits in both integer and fractional parts
 *
 * @param index - The string to validate as a fractional index
 * @returns True if the string is a valid fractional index, false otherwise
 */
export function isValidFractionalIndex(index: Uint8Array): boolean {
  if (!index.length || isSmallestInteger(index)) {
    // The smallest integer is not a valid fractional index. It must have a fractional part.
    return false;
  }

  const parts = splitParts(index);
  if (!parts) {
    // Invalid integer length character or the integer part is too short.
    return false;
  }

  const [, fractional] = parts;
  if (fractional?.at(-1) === 0) {
    // Trailing zeros are not allowed in the fractional part.
    return false;
  }

  // All bytes in a Uint8Array are valid by definition (0-255),
  // so we don't need to check each byte like in the string version

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
 * @returns A new key that sorts between a and b
 */
function generateKeyBetweenUnsafe(
  a: Uint8Array | null,
  b: Uint8Array | null,
): Uint8Array {
  // Strategy: Handle different cases based on bounds
  if (!a) {
    if (!b) {
      // Case: First key (no bounds)
      return INTEGER_ZERO.slice();
    }

    // Case: Key before first key
    const [bInt, bFrac] = ensureNotUndefined(splitParts(b));
    if (isSmallestInteger(bInt)) {
      // Edge case: b is already at the smallest possible integer
      // We can't decrement the integer part further, so we need to use a fractional part
      // that sorts before b's fractional part
      return concat(
        bInt,
        ensureNotUndefined(getMidpointFractional(new Uint8Array(), bFrac)),
      );
    }

    if (bFrac.length) {
      // Optimization: If b has a fractional part, we can use just its integer part
      // This creates a shorter key that still sorts correctly before b
      return bInt.slice();
    }

    // Standard case: Decrement the integer part of b
    const decremented = ensureNotUndefined(
      decrementInteger(bInt),
    ) as Uint8Array;
    if (!isSmallestInteger(decremented)) {
      return decremented;
    }

    // Edge case: If we hit the smallest integer, add the largest digit as fractional part
    // This ensures we still have a valid key that sorts before b
    const result = new Uint8Array(decremented.length + 1);
    result.set(decremented);
    result[decremented.length] = 255;
    return result;
  }

  if (!b) {
    // Case: Key after last key
    const aParts = ensureNotUndefined(splitParts(a));
    const [aInt, aFrac] = aParts;

    // Try to increment the integer part first (most efficient)
    const incremented = ensureNotUndefined(incrementInteger(aInt));
    if (incremented) {
      // If we can increment the integer part, use that result
      // This creates a shorter key than using fractional parts
      return incremented;
    }

    // Edge case: We've reached the largest possible integer representation
    // We need to use the fractional part method instead
    // Calculate a fractional part that sorts after a's fractional part
    return concat(aInt, ensureNotUndefined(getMidpointFractional(aFrac, null)));
  }

  // Case: Key between two existing keys
  const [aInt, aFrac] = ensureNotUndefined(splitParts(a));
  const [bInt, bFrac] = ensureNotUndefined(splitParts(b));

  // If both keys have the same integer part, we need to find a fractional part between them
  if (!compare(aInt, bInt)) {
    // Calculate the midpoint between the two fractional parts
    return concat(
      aInt,
      ensureNotUndefined(getMidpointFractional(aFrac, bFrac)),
    );
  }

  // Try to increment a's integer part
  const cInt = ensureNotUndefined(incrementInteger(aInt));

  // Two possible outcomes:
  return cInt && compare(cInt, bInt)
    ? // 1. If incrementing a's integer doesn't reach b's integer,
      // we can use the incremented value (shorter key)
      cInt
    : // 2. If incrementing a's integer equals b's integer or we can't increment,
      // we need to use a's integer with a fractional part that sorts after a's fractional part
      concat(aInt, ensureNotUndefined(getMidpointFractional(aFrac, null)));
}

/**
 * Generates a key between two existing keys with validation.
 * This function validates the input keys before generating a new key between them.
 * It returns undefined if either key is invalid or if b is less than or equal to a.
 *
 * @param a - The lower bound key, or null if there is no lower bound
 * @param b - The upper bound key, or null if there is no upper bound
 * @returns A new key that sorts between a and b, or undefined if inputs are invalid
 */
export function generateKeyBetween(
  a: Uint8Array | null,
  b: Uint8Array | null,
): Uint8Array | undefined {
  return (a != null && !isValidFractionalIndex(a)) ||
    (b != null && !isValidFractionalIndex(b)) ||
    (a != null && b != null && compare(a, b) >= 0)
    ? undefined
    : generateKeyBetweenUnsafe(forceUint8Array(a), forceUint8Array(b));
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
 * @returns An array of n new keys that sort between a and b
 */
function generateNKeysBetweenUnsafe(
  a: Uint8Array | null,
  b: Uint8Array | null,
  n: number,
): Uint8Array[] {
  if (n < 1) {
    return [];
  }

  if (n === 1) {
    return [generateKeyBetweenUnsafe(a, b)];
  }

  // Special case: Generate n keys after a (no upper bound)
  if (b == null) {
    let c = a;
    // Sequential generation - each new key is after the previous one
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(c, b)),
    );
  }

  // Special case: Generate n keys before b (no lower bound)
  if (a == null) {
    let c = b;
    // Sequential generation in reverse - each new key is before the previous one
    // Then reverse the array to get ascending order
    return Array.from(
      { length: n },
      () => (c = generateKeyBetweenUnsafe(a, c)),
    ).reverse();
  }

  // Divide-and-conquer approach for better distribution of keys
  const mid = n >> 1; // Fast integer division by 2

  // Find a midpoint key between a and b
  const c = generateKeyBetweenUnsafe(a, b);

  // Recursively generate keys in both halves and combine them
  // This creates a more balanced distribution than sequential generation
  return [
    ...generateNKeysBetweenUnsafe(a, c, mid),
    c,
    ...generateNKeysBetweenUnsafe(c, b, n - mid - 1),
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
 * @returns An array of n new keys that sort between a and b, or undefined if inputs are invalid
 */
export function generateNKeysBetween(
  a: Uint8Array | null,
  b: Uint8Array | null,
  n: number,
): Uint8Array[] | undefined {
  return (a != null && !isValidFractionalIndex(a)) ||
    (b != null && !isValidFractionalIndex(b)) ||
    (a != null && b != null && compare(a, b) >= 0)
    ? undefined
    : generateNKeysBetweenUnsafe(forceUint8Array(a), forceUint8Array(b), n);
}

/**
 * Generates a suffix to avoid conflicts between fractional indices.
 * This function creates a unique suffix based on the count value,
 * converting it to the specified digit base. The suffix is used to
 * ensure uniqueness when multiple indices need to be generated between
 * the same bounds.
 *
 * @param count - The count value to convert to a suffix
 * @returns A binary suffix in the specified digit base
 */
export function avoidConflictSuffix(count: number): Uint8Array {
  const additionalFrac: number[] = [];

  // Convert a number to a binary representation
  // This works like converting to a different number base,
  // but we write the digits in reverse order.
  //
  // For example, in binary:
  // - The number 3 would become [3]
  // - The number 256 would become [0, 1]
  // - The number 1234 would become bytes representing 1234 in little-endian
  //
  // We do this reversed ordering to ensure the array doesn't end with zeros,
  // which we need to avoid in fractional indices.
  while (count > 0) {
    // Add the byte for the current remainder
    additionalFrac.push(count & 255);
    // Integer division to get the next byte
    count >>= 8;
  }

  // The result is a unique suffix for each count value
  return new Uint8Array(additionalFrac);
}
