/**
 * Splits a base string into an array of characters and validates it.
 * This function ensures the base string meets the requirements:
 * - Has at least 4 unique characters
 * - Characters are in ascending order (by character code)
 *
 * @param base - The base string to split and validate
 * @returns An array of characters from the base string
 * @throws Error if the base string is invalid
 */
function splitBase(base: string): string[] {
  // Intentionally not using a spread operator to ensure consistent splitting behavior.
  // That means we don't support strings with surrogate pairs.
  const forward = base.split("");

  if (forward.length < 4) {
    // There is no clear rationale for this number, but it seems like a reasonable minimum.
    // - We need at least 2 characters to represent +1 and -1 in integer length bases.
    // - We need at least 3 characters to calculate the middle of fractional parts.
    // - I'm afraid of something, so +1.
    throw new Error("Base must have at least 4 characters.");
  }

  let lastCode = -1;
  for (const char of forward) {
    const code = char.charCodeAt(0);
    if (code <= lastCode) {
      throw new Error(
        "Invalid base characters. Characters must be unique and in ascending order."
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
 * @throws Error if the base string is invalid (via splitBase)
 */
export function createDigitBaseMap(
  base: string
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
 * @throws Error if the base string is invalid (via splitBase)
 */
export function createIntegerLengthBaseMap(
  base: string
): [
  forward: ReadonlyMap<number, string>,
  reverse: ReadonlyMap<string, number>
] {
  // We always convert characters to an array first to ensure consistent splitting behavior.
  const forward = splitBase(base);

  const positiveBegin = forward.length >> 1;
  const forwardEntries = forward.map(
    (char, index) =>
      [
        index < positiveBegin
          ? index - positiveBegin // Negative integers start from -1 and go down for convenience.
          : index - positiveBegin + 1, // Note that length 0 is not used.
        char,
      ] as const
  );

  return [
    new Map(forwardEntries),
    new Map(forwardEntries.map(([value, char]) => [char, value])),
  ];
}
