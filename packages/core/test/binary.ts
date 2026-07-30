import { Buffer } from "node:buffer";

/**
 * Converts a Uint8Array to a hexadecimal string representation.
 * Useful for making binary data readable in test output.
 *
 * @param binary - The binary data to convert
 * @returns A hexadecimal string representation of the binary data
 */
export function toHex(binary: Uint8Array): string {
  return Buffer.from(binary).toString("hex");
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 * Useful for creating binary data from readable hex strings in tests.
 *
 * @param hex - The hexadecimal string to convert
 * @returns A Uint8Array containing the binary data
 */
export function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/**
 * Creates a Uint8Array with a specific length and initial byte.
 * Useful for creating test data with a specific pattern.
 *
 * @param length - The length of the array
 * @param initialByte - The byte value to fill the array with (default: 0)
 * @returns A new Uint8Array with the specified length and filled with the initial byte
 */
export function createBinary(
  length: number,
  initialByte: number = 0,
): Uint8Array {
  return new Uint8Array(length).fill(initialByte);
}
