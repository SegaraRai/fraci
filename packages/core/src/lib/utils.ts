import { FraciError, type FraciErrorCode } from "./errors.js";

const ERROR_CODE_INITIALIZATION_FAILED =
  "INITIALIZATION_FAILED" satisfies FraciErrorCode;

/**
 * Splits a base string into an array of characters and validates it.
 * This function ensures the base string meets the requirements:
 * - Has at least 4 unique characters
 * - Characters are in ascending order (by character code)
 *
 * @param base - The base string to split and validate
 * @returns An array of characters from the base string
 * @throws {FraciError} Throws a {@link FraciError} when the base string has fewer than 4 unique characters
 * @throws {FraciError} Throws a {@link FraciError} when the base string characters are not unique or not in ascending order
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 */
function splitBase(base: string): string[] {
  // Intentionally not using a spread operator to ensure consistent splitting behavior.
  // That means we don't support strings with surrogate pairs.
  const forward = base.split("");

  if (forward.length < 4) {
    // Minimum length requirement ensures the system has enough distinct characters:
    // - We need at least 2 characters to represent +1 and -1 in integer length bases.
    // - We need at least 3 characters to calculate the middle of fractional parts.
    // - An extra character provides additional flexibility.
    throw new FraciError(
      ERROR_CODE_INITIALIZATION_FAILED,
      "Base string must have at least 4 unique characters",
    );
  }

  // Validate that characters are in strictly ascending order
  // This is essential for correct sorting behavior in the fractional indexing system
  let lastCode = -1;
  for (const char of forward) {
    const code = char.charCodeAt(0);
    if (code <= lastCode) {
      throw new FraciError(
        ERROR_CODE_INITIALIZATION_FAILED,
        "Base string characters must be unique and in ascending order",
      );
    }
    lastCode = code;
  }

  return forward;
}

/**
 * Creates forward and reverse mappings for a digit base.
 * This function converts a base string into a pair of data structures:
 * 1. An array mapping positions to characters
 * 2. A map from characters to their positions
 *
 * @param base - The base string containing unique characters in ascending order
 * @returns A tuple containing the forward array and reverse map
 * @throws {FraciError} Throws a {@link FraciError} when the base string has fewer than 4 unique characters (via {@link splitBase})
 * @throws {FraciError} Throws a {@link FraciError} when the base string characters are not unique or not in ascending order (via {@link splitBase})
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 */
export function createDigitBaseMap(
  base: string,
): [forward: readonly string[], reverse: ReadonlyMap<string, number>] {
  // We always convert characters to an array first to ensure consistent splitting behavior.
  const forward = splitBase(base);

  return [forward, new Map(forward.map((char, index) => [char, index]))];
}

/**
 * Creates forward and reverse mappings for integer length encoding.
 * This function converts a base string into a pair of maps:
 * 1. A map from integer lengths to their encoding characters
 * 2. A map from encoding characters to their integer lengths
 *
 * The characters are distributed to represent both positive and negative lengths,
 * with the first half of characters representing negative lengths and the second
 * half representing positive lengths (skipping 0).
 *
 * @param base - The base string containing unique characters in ascending order
 * @returns A tuple containing the forward map (length → char) and reverse map (char → length)
 * @throws {FraciError} Throws a {@link FraciError} when the base string has fewer than 4 unique characters (via {@link splitBase})
 * @throws {FraciError} Throws a {@link FraciError} when the base string characters are not unique or not in ascending order (via {@link splitBase})
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 */
export function createIntegerLengthBaseMap(
  base: string,
): [
  forward: ReadonlyMap<number, string>,
  reverse: ReadonlyMap<string, number>,
] {
  // We always convert characters to an array first to ensure consistent splitting behavior.
  const forward = splitBase(base);

  // Divide the character set in half to represent negative and positive lengths
  // This is a key design decision that allows representing both positive and negative integers
  const positiveBegin = forward.length >> 1; // Fast integer division by 2

  // Map each character to a signed integer length value
  // The first half of characters map to negative lengths, the second half to positive
  // Important: We deliberately skip 0 as a length value to simplify the algorithm
  const forwardEntries = forward.map(
    (char, index) =>
      [
        index < positiveBegin
          ? // For characters in the first half, assign negative values starting from -1
            index - positiveBegin // This maps to -1, -2, -3, etc.
          : // For characters in the second half, assign positive values starting from 1
            index - positiveBegin + 1, // This maps to 1, 2, 3, etc. (skipping 0)
        char,
      ] as const,
  );

  // Create both forward (length → char) and reverse (char → length) maps
  // This allows efficient lookups in both directions
  return [
    new Map(forwardEntries),
    new Map(forwardEntries.map(([value, char]) => [char, value])),
  ];
}
