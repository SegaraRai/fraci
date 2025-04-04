/**
 * Error codes for the Fraci library.
 *
 * These codes help identify specific error conditions that may occur during library operations.
 *
 * - `INITIALIZATION_FAILED`: Indicates that the library failed to initialize.
 *   Currently seen when the base string does not meet the requirements, or when the specified model or field does not exist in the generated Prisma client.
 * - `INTERNAL_ERROR`: Indicates an internal error in the library. Please file an issue if you see this.
 * - `INVALID_FRACTIONAL_INDEX`: Indicates that an invalid fractional index was provided to `generateKeyBetween` or `generateNKeysBetween` functions.
 * - `MAX_LENGTH_EXCEEDED`: Indicates that the maximum length of the generated key was exceeded.
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 */
export type FraciErrorCode =
  | "INITIALIZATION_FAILED"
  | "INTERNAL_ERROR"
  | "INVALID_FRACTIONAL_INDEX"
  | "MAX_LENGTH_EXCEEDED";

/**
 * Custom error class for the Fraci library.
 *
 * This class encapsulates errors that occur during fractional indexing operations,
 * providing structured error information through error codes and descriptive messages.
 * Use the utility functions {@link isFraciError} and {@link getFraciErrorCode} to safely work with these errors.
 *
 * @see {@link FraciErrorCode} - The error codes for the Fraci library
 * @see {@link isFraciError} - Type guard to check if an error is a FraciError
 * @see {@link getFraciErrorCode} - Function to extract the error code from a FraciError
 */
export class FraciError extends Error {
  readonly name: "FraciError";

  constructor(
    /**
     * The specific error code identifying the type of error.
     */
    readonly code: FraciErrorCode,
    /**
     * A descriptive message providing details about the error condition.
     */
    readonly message: string,
  ) {
    super(`[${code}] ${message}`);

    this.name = "FraciError";
  }
}

/**
 * Type guard that checks if the given error is an instance of {@link FraciError}.
 *
 * This is useful in error handling blocks to determine if an error originated from the Fraci library.
 *
 * @param error - The error to check
 * @returns `true` if the error is a {@link FraciError}, `false` otherwise
 *
 * @example
 * ```typescript
 * try {
 *   // Some Fraci operation
 * } catch (error) {
 *   if (isFraciError(error)) {
 *     // Handle Fraci-specific error
 *   } else {
 *     // Handle other types of errors
 *   }
 * }
 * ```
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 * @see {@link getFraciErrorCode} - Function to extract the error code from a {@link FraciError}
 */
export function isFraciError(error: unknown): error is FraciError {
  return error instanceof FraciError;
}

/**
 * Extracts the error code from a {@link FraciError}.
 *
 * This function safely extracts the error code without requiring type checking first.
 * If the error is not a {@link FraciError}, it returns `undefined`.
 *
 * @param error - The error to extract the code from
 * @returns The {@link FraciErrorCode} if the error is a {@link FraciError}, `undefined` otherwise
 *
 * @example
 * ```typescript
 * try {
 *   // Some Fraci operation
 * } catch (error) {
 *   switch (getFraciErrorCode(error)) {
 *     case "MAX_LENGTH_EXCEEDED":
 *       // Handle specific error case
 *       break;
 *
 *     default:
 *       // Handle other cases, including unknown errors
 *       // or Fraci errors that are not handled above
 *       break;
 *   }
 * }
 * ```
 *
 * @see {@link FraciError} - The custom error class for the Fraci library
 * @see {@link FraciErrorCode} - The error codes for the Fraci library
 * @see {@link isFraciError} - Type guard to check if an error is a {@link FraciError}
 */
export function getFraciErrorCode(error: unknown): FraciErrorCode | undefined {
  return error instanceof FraciError ? error.code : undefined;
}
