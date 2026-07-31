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

  const chunks: string[] = [];
  let aOffset = 0;
  let bOffset = 0;
  let upper = b;

  // Use an iterative implementation so adversarially long, but otherwise valid,
  // fractional parts cannot exhaust the JavaScript call stack.
  while (true) {
    if (upper) {
      const remainingUpperLength = upper.length - bOffset;
      let prefixLength = 0;
      while (
        prefixLength < remainingUpperLength &&
        upper[bOffset + prefixLength] ===
          (a[aOffset + prefixLength] ?? digBaseForward[0])
      ) {
        prefixLength++;
      }

      if (prefixLength > 0) {
        chunks.push(upper.slice(bOffset, bOffset + prefixLength));
        aOffset += prefixLength;
        bOffset += prefixLength;
        continue;
      }
    }

    const aChar = a[aOffset];
    const bChar = upper?.[bOffset];
    const aDigit = aChar ? digBaseReverse.get(aChar) : 0;
    const bDigit = bChar
      ? digBaseReverse.get(bChar)
      : upper
        ? undefined
        : digBaseForward.length;
    if (aDigit == null || bDigit == null) {
      return;
    }

    if (aDigit + 1 !== bDigit) {
      chunks.push(digBaseForward[Math.floor((aDigit + bDigit) / 2)]);
      return chunks.join("");
    }

    if (upper && upper.length - bOffset > 1) {
      chunks.push(upper[bOffset]);
      return chunks.join("");
    }

    chunks.push(digBaseForward[aDigit]);
    aOffset++;
    upper = null;
    bOffset = 0;
  }
}
