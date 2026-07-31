export const INTEGER_ZERO = new Uint8Array([128, 0]);

export const INTEGER_MINUS_ONE = new Uint8Array([127, 255]);

/**
 * Compares two Uint8Arrays.
 *
 * @param a - The first array
 * @param b - The second array
 * @returns A number indicating the comparison result
 *   - Negative if a < b
 *   - Zero if a == b
 *   - Positive if a > b
 */
export function compare(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  let r = 0;
  for (let i = 0; !r && i < len; i++) {
    r = a[i] - b[i];
  }
  return r || a.length - b.length;
}

/**
 * Concatenates two Uint8Arrays.
 *
 * @param a - The first array
 * @param b - The second array
 * @returns The concatenated array
 */
export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

/**
 * Gets the signed length of the integer part from a binary fractional index.
 * This function extracts the length information encoded in the first byte of the index string.
 *
 * @param index - The fractional index binary
 * @returns The signed length of the integer part, or NaN if the first character is invalid
 */
export function getIntegerLengthSigned(index: Uint8Array): number {
  const [value] = index;
  return value - (value >= 128 ? 127 : 128);
}

/**
 * Gets the byte representing the length of the integer part.
 * Reverse operation of {@link getIntegerLengthSigned}.
 *
 * @param signedLength - The signed length of the integer part
 * @returns The byte representing the length of the integer part
 */
export function getIntegerLengthByte(signedLength: number): number {
  return signedLength + (signedLength < 0 ? 128 : 127);
}

/**
 * Checks if a binary fractional index represents the smallest possible integer.
 *
 * @param index - The fractional index binary to check
 * @returns A boolean indicating if the index represents the smallest integer
 */
export function isSmallestInteger(index: Uint8Array): boolean {
  return index.length === 129 && index.every((v) => v === 0);
}

/**
 * Splits a fractional index binary into its integer and fractional parts.
 * This function uses the length information encoded in the first character
 * to determine where to split the binary.
 *
 * @param index - The fractional index binary to split
 * @returns A tuple containing the integer and fractional parts, or undefined if the index is invalid
 */
export function splitParts(
  index: Uint8Array,
): [integer: Uint8Array, fractional: Uint8Array] | undefined {
  // Get the encoded length from the first character and convert to absolute value
  // Add 1 because the length includes the length character itself
  const intLength = Math.abs(getIntegerLengthSigned(index)) + 1;

  // Validation: ensure the length is valid and the binary is long enough
  if (Number.isNaN(intLength) || index.length < intLength) {
    // Invalid length or binary too short
    return;
  }

  // Split the string into integer and fractional parts
  // The integer part includes the length character and the digits
  // The fractional part is everything after the integer part
  return [index.subarray(0, intLength), index.subarray(intLength)];
}

/**
 * Increments the integer part of a fractional index.
 * This function handles carrying and length changes when incrementing the integer.
 *
 * @param index - The fractional index binary whose integer part should be incremented
 * @returns
 *   - A new binary with the incremented integer part
 *   - null if the integer cannot be incremented (reached maximum value)
 *   - undefined if the input is invalid
 */
export function incrementInteger(
  index: Uint8Array,
): Uint8Array | null | undefined {
  if (!index.length) {
    return;
  }

  const intLengthSigned = getIntegerLengthSigned(index);

  // Extract the length character and the actual digits from the integer part
  const digits = index.slice(0, Math.abs(intLengthSigned) + 1);

  // Try to increment the rightmost digit first, with carrying if needed
  // This is similar to adding 1 to a number in the custom base system
  for (let i = digits.length - 1; i >= 1; i--) {
    // Increment the digit and check for overflow
    // Note that Uint8Array wraps around on overflow, which is what we want
    if (digits[i]++ < 255) {
      // The digit is not 255 before increment, meaning no overflow will occur
      // This is the common case for most increments
      return digits;
    }

    // Overflow occurred - carry to the next digit to the left
  }

  // Special case: transitioning from negative to zero
  // This is like going from -1 to 0 in decimal, which requires special handling
  if (intLengthSigned === -1) {
    // The integer is -1. We need to return 0.
    // This requires changing the length encoding character to represent positive length
    return INTEGER_ZERO.slice();
  }

  // If we get here, we've carried through all digits (like 999 + 1 = 1000)
  // We need to increase the length of the integer representation
  const newLenSigned = intLengthSigned + 1;
  if (newLenSigned > 128) {
    // Reached the limit of representable integers
    // This is an edge case where we can't represent a larger integer
    return null;
  }

  // Create a new integer with increased length (all digits are smallest digit)
  const newBinary = new Uint8Array(Math.abs(newLenSigned) + 1);
  newBinary[0] = getIntegerLengthByte(newLenSigned);
  return newBinary;
}

/**
 * Decrements the integer part of a fractional index.
 * This function handles borrowing and length changes when decrementing the integer.
 *
 * @param index - The fractional index string whose integer part should be decremented
 * @returns
 *   - A new binary with the decremented integer part
 *   - null if the integer cannot be decremented (reached minimum value)
 *   - undefined if the input is invalid
 */
export function decrementInteger(
  index: Uint8Array,
): Uint8Array | null | undefined {
  const intLengthSigned = getIntegerLengthSigned(index);
  if (Number.isNaN(intLengthSigned)) {
    return;
  }

  // Extract the length character and the actual digits from the integer part
  const digits = index.slice(0, Math.abs(intLengthSigned) + 1);

  // Try to decrement the rightmost digit first, with borrowing if needed
  // This is similar to subtracting 1 from a number in the custom base system
  for (let i = digits.length - 1; i >= 1; i--) {
    // Decrement the digit and check for underflow
    // Note that Uint8Array wraps around on underflow, which is what we want
    if (digits[i]--) {
      // The digit is non-zero before decrement, meaning no underflow will occur
      return digits;
    }

    // Underflow occurred - borrow from the next digit to the left
  }

  // Special case: transitioning from zero to negative integers
  // This is like going from 0 to -1 in decimal, which requires special handling
  if (intLengthSigned === 1) {
    // The integer is 0. We need to return -1.
    // This requires changing the length encoding character to represent negative length
    return INTEGER_MINUS_ONE.slice();
  }

  // If we get here, we've borrowed through all digits (like 1000 - 1 = 999)
  // We need to decrease the length of the integer representation
  const newLenSigned = intLengthSigned - 1;
  if (newLenSigned < -128) {
    // Reached the limit of representable integers
    // This is an edge case where we can't represent a smaller integer
    return null;
  }

  // Create a new integer with decreased length (all digits are largest digit)
  const newBinary = new Uint8Array(Math.abs(newLenSigned) + 1).fill(255);
  newBinary[0] = getIntegerLengthByte(newLenSigned);
  return newBinary;
}

/**
 * Calculates the midpoint between two fractional parts.
 * This function recursively finds a string that sorts between two fractional parts.
 * It handles various cases including when one of the inputs is null.
 *
 * @param a - The lower bound fractional part, or empty binary if there is no lower bound
 * @param b - The upper bound fractional part, or null if there is no upper bound
 * @returns A binary that sorts between a and b, or undefined if inputs are invalid
 */
export function getMidpointFractional(
  a: Uint8Array,
  b: Uint8Array | null,
): Uint8Array | undefined {
  if (b != null && compare(a, b) >= 0) {
    // Precondition failed.
    return;
  }

  const result: number[] = [];
  let aOffset = 0;
  let bOffset = 0;
  let upper = b;

  // Avoid recursive concatenation, which can otherwise consume quadratic
  // allocation and exhaust the stack for long fractional parts.
  while (true) {
    if (upper) {
      const remainingUpperLength = upper.length - bOffset;
      let prefixLength = 0;
      while (
        prefixLength < remainingUpperLength &&
        upper[bOffset + prefixLength] === (a[aOffset + prefixLength] ?? 0)
      ) {
        prefixLength++;
      }

      if (prefixLength > 0) {
        for (let i = 0; i < prefixLength; i++) {
          result.push(upper[bOffset + i]);
        }
        aOffset += prefixLength;
        bOffset += prefixLength;
        continue;
      }
    }

    const aDigit = a[aOffset] ?? 0;
    const bDigit = upper ? upper[bOffset] : 256;
    if (bDigit == null) {
      return;
    }

    if (aDigit + 1 !== bDigit) {
      result.push(Math.floor((aDigit + bDigit) / 2));
      return new Uint8Array(result);
    }

    if (upper && upper.length - bOffset > 1) {
      result.push(upper[bOffset]);
      return new Uint8Array(result);
    }

    result.push(aDigit);
    aOffset++;
    upper = null;
    bOffset = 0;
  }
}
