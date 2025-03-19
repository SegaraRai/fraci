/**
 * Gets the signed length of the integer part from a fractional index.
 * This function extracts the length information encoded in the first character
 * of the index string.
 *
 * @param index - The fractional index string
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @returns The signed length of the integer part, or undefined if the first character is invalid
 */
export function getIntegerLengthSigned(
  index: string,
  lenBaseReverse: ReadonlyMap<string, number>,
): number | undefined {
  return lenBaseReverse.get(index[0]);
}

/**
 * Splits a fractional index string into its integer and fractional parts.
 * This function uses the length information encoded in the first character
 * to determine where to split the string.
 *
 * @param index - The fractional index string to split
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @returns A tuple containing the integer and fractional parts, or undefined if the index is invalid
 */
export function splitParts(
  index: string,
  lenBaseReverse: ReadonlyMap<string, number>,
): [integer: string, fractional: string] | undefined {
  // Get the encoded length from the first character and convert to absolute value
  // Add 1 because the length includes the length character itself
  const intLength =
    Math.abs(getIntegerLengthSigned(index, lenBaseReverse) ?? 0) + 1;

  // Validation: ensure the length is valid and the string is long enough
  if (intLength < 2 || index.length < intLength) {
    // Invalid length or string too short
    return;
  }

  // Split the string into integer and fractional parts
  // The integer part includes the length character and the digits
  // The fractional part is everything after the integer part
  return [index.slice(0, intLength), index.slice(intLength)];
}

/**
 * Generates a string representation of the integer zero.
 * This function creates a string that represents the integer zero
 * in the specified digit base and length encoding.
 *
 * @param digBaseForward - Array mapping digit positions to characters
 * @param lenBaseForward - Map of length values to their encoding characters
 * @returns A string representation of the integer zero
 */
export function getIntegerZero(
  digBaseForward: readonly string[],
  lenBaseForward: ReadonlyMap<number, string>,
): string {
  return lenBaseForward.get(1)! + digBaseForward[0];
}

/**
 * Generates a string representation of the smallest possible integer.
 * This function finds the smallest length value in the length encoding map
 * and creates a string representing the smallest possible integer.
 *
 * @param digBaseForward - Array mapping digit positions to characters
 * @param lenBaseForward - Map of length values to their encoding characters
 * @returns A string representation of the smallest possible integer
 */
export function getSmallestInteger(
  digBaseForward: readonly string[],
  lenBaseForward: ReadonlyMap<number, string>,
): string {
  // Find the smallest length value in the length encoding map
  // This will be the most negative value, representing the smallest possible integer
  const minKey = Math.min(...Array.from(lenBaseForward.keys()));

  // Get the character that encodes this smallest length
  const minLenChar = lenBaseForward.get(minKey)!;

  // Create a string with the length character followed by the smallest digit repeated
  // The number of repetitions is the absolute value of the length
  return `${minLenChar}${digBaseForward[0].repeat(Math.abs(minKey))}`;
}

/**
 * Increments the integer part of a fractional index.
 * This function handles carrying and length changes when incrementing the integer.
 *
 * @param index - The fractional index string whose integer part should be incremented
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseForward - Map of length values to their encoding characters
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @returns
 *   - A new string with the incremented integer part
 *   - null if the integer cannot be incremented (reached maximum value)
 *   - undefined if the input is invalid
 */
export function incrementInteger(
  index: string,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>,
): string | null | undefined {
  const intLengthSigned = getIntegerLengthSigned(index, lenBaseReverse);
  if (!intLengthSigned) {
    return;
  }

  const smallestDigit = digBaseForward[0];

  // Extract the length character and the actual digits from the integer part
  const [lenChar, ...digits] = index.slice(0, Math.abs(intLengthSigned) + 1);

  // Try to increment the rightmost digit first, with carrying if needed
  // This is similar to adding 1 to a number in the custom base system
  for (let i = digits.length - 1; i >= 0; i--) {
    const value = digBaseReverse.get(digits[i]);
    if (value == null) {
      // Invalid digit
      return;
    }

    if (value < digBaseForward.length - 1) {
      // No carrying needed - we can increment this digit and return
      // This is the common case for most increments
      digits[i] = digBaseForward[value + 1];
      return `${lenChar}${digits.join("")}`;
    }

    // This digit is at max value (9 in decimal), set to smallest (0) and continue carrying
    // We need to carry to the next digit to the left
    digits[i] = smallestDigit;
  }

  // Special case: transitioning from negative integers to zero
  // This is like going from -1 to 0 in decimal, which requires special handling
  if (intLengthSigned === -1) {
    // The integer is -1. We need to return 0.
    // This requires changing the length encoding character
    return `${lenBaseForward.get(1)!}${smallestDigit}`;
  }

  // If we get here, we've carried through all digits (like 999 + 1 = 1000)
  // We need to increase the length of the integer representation
  const newLenSigned = intLengthSigned + 1;
  const newLenChar = lenBaseForward.get(newLenSigned);
  if (!newLenChar) {
    // Reached the limit of representable integers
    // This is an edge case where we can't represent a larger integer
    return null;
  }

  // Create a new integer with increased length (all digits are smallest digit)
  // For example, in decimal: 999 + 1 = 1000 (all zeros with a 1 at the start)
  // But in our system, we encode the length separately
  return `${newLenChar}${smallestDigit.repeat(Math.abs(newLenSigned))}`;
}

/**
 * Decrements the integer part of a fractional index.
 * This function handles borrowing and length changes when decrementing the integer.
 *
 * @param index - The fractional index string whose integer part should be decremented
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @param lenBaseForward - Map of length values to their encoding characters
 * @param lenBaseReverse - Map of length encoding characters to their numeric values
 * @returns
 *   - A new string with the decremented integer part
 *   - null if the integer cannot be decremented (reached minimum value)
 *   - undefined if the input is invalid
 */
export function decrementInteger(
  index: string,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
  lenBaseForward: ReadonlyMap<number, string>,
  lenBaseReverse: ReadonlyMap<string, number>,
): string | null | undefined {
  const intLengthSigned = getIntegerLengthSigned(index, lenBaseReverse);
  if (!intLengthSigned) {
    return;
  }

  const largestDigit = digBaseForward[digBaseForward.length - 1];

  // Extract the length character and the actual digits from the integer part
  const [lenChar, ...digits] = index.slice(0, Math.abs(intLengthSigned) + 1);

  // Try to decrement the rightmost digit first, with borrowing if needed
  // This is similar to subtracting 1 from a number in the custom base system
  for (let i = digits.length - 1; i >= 0; i--) {
    const value = digBaseReverse.get(digits[i]);
    if (value == null) {
      // Invalid digit
      return;
    }

    if (value > 0) {
      // No borrowing needed - we can decrement this digit and return
      // This is the common case for most decrements
      digits[i] = digBaseForward[value - 1];
      return `${lenChar}${digits.join("")}`;
    }

    // This digit is at min value (0 in decimal), set to largest (9) and continue borrowing
    // We need to borrow from the next digit to the left
    digits[i] = largestDigit;
  }

  // Special case: transitioning from zero to negative integers
  // This is like going from 0 to -1 in decimal, which requires special handling
  if (intLengthSigned === 1) {
    // The integer is 0. We need to return -1.
    // This requires changing the length encoding character to represent negative length
    return `${lenBaseForward.get(-1)!}${largestDigit}`;
  }

  // If we get here, we've borrowed through all digits (like 1000 - 1 = 999)
  // We need to decrease the length of the integer representation
  const newLenSigned = intLengthSigned - 1;
  const newLenChar = lenBaseForward.get(newLenSigned);
  if (!newLenChar) {
    // Reached the limit of representable integers
    // This is an edge case where we can't represent a smaller integer
    return null;
  }

  // Create a new integer with decreased length (all digits are largest digit)
  // For example, in decimal: 1000 - 1 = 999 (all nines)
  // But in our system, we encode the length separately
  return `${newLenChar}${largestDigit.repeat(Math.abs(newLenSigned))}`;
}

/**
 * Calculates the midpoint between two fractional parts.
 * This function recursively finds a string that sorts between two fractional parts.
 * It handles various cases including when one of the inputs is null.
 *
 * @param a - The lower bound fractional part, or empty string if there is no lower bound
 * @param b - The upper bound fractional part, or null if there is no upper bound
 * @param digBaseForward - Array mapping digit positions to characters
 * @param digBaseReverse - Map of digit characters to their numeric values
 * @returns A string that sorts between a and b, or undefined if inputs are invalid
 */
export function getMidpointFractional(
  a: string,
  b: string | null,
  digBaseForward: readonly string[],
  digBaseReverse: ReadonlyMap<string, number>,
): string | undefined {
  if (b != null && b <= a) {
    // Precondition failed.
    return;
  }

  // Optimization: If a and b share a common prefix, preserve it
  if (b) {
    // Pad a with zeros to match b's length for comparison
    const aPadded = a.padEnd(b.length, digBaseForward[0]);

    // Find the first position where a and b differ
    const prefixLength = Array.prototype.findIndex.call(
      b,
      (char, i) => char !== aPadded[i],
    );

    // If they share a prefix, keep it and recursively find midpoint of the differing parts
    if (prefixLength > 0) {
      return `${b.slice(0, prefixLength)}${getMidpointFractional(
        a.slice(prefixLength),
        b.slice(prefixLength),
        digBaseForward,
        digBaseReverse,
      )}`;
    }
  }

  // At this point, we're handling the first differing digits
  const aDigit = a ? digBaseReverse.get(a[0]) : 0;
  const bDigit = b ? digBaseReverse.get(b[0]) : digBaseForward.length;
  if (aDigit == null || bDigit == null) {
    // Invalid digit.
    return;
  }

  // Case 1: Non-consecutive digits - we can simply use their average
  if (aDigit + 1 !== bDigit) {
    const mid = (aDigit + bDigit) >> 1; // Fast integer division by 2
    return digBaseForward[mid];
  }

  // Case 2: Consecutive digits with b having two or more digits
  if (b && b.length > 1) {
    // We can just use b's first digit (which is one more than a's first digit)
    return b[0];
  }

  // Case 3: Consecutive digits with b having length 1 or null
  // This is the most complex case requiring recursive construction
  // Example: midpoint('49', '5') becomes '495'
  // We take a's first digit, then recursively find midpoint of a's remainder and null
  return `${digBaseForward[aDigit]}${getMidpointFractional(
    a.slice(1),
    null,
    digBaseForward,
    digBaseReverse,
  )}`;
}
