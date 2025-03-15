import { getSmallestInteger } from "./lib/decimal.js";
import {
  avoidConflictSuffix,
  generateKeyBetween,
  generateNKeysBetween,
} from "./lib/fractional-indexing.js";
import type { FractionalIndex } from "./lib/types.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./lib/utils.js";

/**
 * Default maximum length for fractional index keys.
 */
export const DEFAULT_MAX_LENGTH = 50;

/**
 * Default maximum number of retry attempts when generating keys.
 */
export const DEFAULT_MAX_RETRIES = 5;

/**
 * Fractional indexing utility that provides methods for generating ordered keys.
 */
export interface Fraci<D extends string, L extends string, X> {
  /**
   * The character set used for representing digits in the fractional index.
   */
  readonly digitBase: D;

  /**
   * The character set used for encoding the length of the integer part.
   */
  readonly lengthBase: L;

  /**
   * Generates a key between two existing keys.
   * Returns a generator that yields new unique keys between the provided bounds.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding fractional index keys
   */
  generateKeyBetween(
    a: FractionalIndex<D, L, X> | null,
    b: FractionalIndex<D, L, X> | null,
    skip?: number
  ): Generator<FractionalIndex<D, L, X>, void, unknown>;

  /**
   * Generates multiple keys evenly distributed between two existing keys.
   * Returns a generator that yields arrays of new unique keys.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param n - Number of keys to generate
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding arrays of fractional index keys
   */
  generateNKeysBetween(
    a: FractionalIndex<D, L, X> | null,
    b: FractionalIndex<D, L, X> | null,
    n: number,
    skip?: number
  ): Generator<FractionalIndex<D, L, X>[], void, unknown>;
}

/**
 * Configuration options for creating a fractional indexing utility.
 */
export interface FraciOptions<D extends string, L extends string> {
  /**
   * The character set used for representing digits in the fractional index.
   */
  digitBase: D;

  /**
   * The character set used for encoding the length of the integer part.
   */
  lengthBase: L;

  /**
   * Maximum allowed length for generated keys.
   * @default DEFAULT_MAX_LENGTH (50)
   */
  maxLength?: number;

  /**
   * Maximum number of retry attempts when generating keys.
   * @default DEFAULT_MAX_RETRIES (5)
   */
  maxRetries?: number;
}

/**
 * Cache for storing computed values to improve performance.
 * Uses a branded type pattern to prevent accidental misuse.
 */
export type FraciCache = Map<string, unknown> & { __fraci__: never };

/**
 * Creates a new empty cache for storing computed values in fractional indexing operations.
 * Using a cache can improve initialization performance when repeatedly using the same base configurations.
 *
 * @returns A new empty FraciCache instance
 * @example
 * ```ts
 * const cache = createFraciCache();
 * const fraci1 = fraci({ digitBase: "0123456789", lengthBase: "abcdefghij" }, cache);
 * const fraci2 = fraci({ digitBase: "0123456789", lengthBase: "abcdefghij" }, cache);
 * // Both instances will share cached computations
 * ```
 */
export function createFraciCache(): FraciCache {
  return new Map() as FraciCache;
}

/**
 * Retrieves a value from cache or computes it if not present.
 *
 * @param cache - The cache to use, or undefined to bypass caching
 * @param key - The cache key to look up
 * @param fn - Function to execute if the value is not in the cache
 * @returns The cached or newly computed value
 */
function withCache<T>(
  cache: FraciCache | undefined,
  key: string,
  fn: () => T
): T {
  // If no cache is provided, just compute the value directly
  if (!cache) {
    return fn();
  }

  // Try to get the value from the cache
  let value = cache.get(key) as T | undefined;
  if (value === undefined) {
    // Value not found in cache, compute it
    value = fn();
    // Store in cache for future use
    cache.set(key, value);
  }

  return value;
}

/**
 * Creates a fractional indexing utility with the specified configuration.
 * This is the main factory function for creating a Fraci instance that can generate
 * fractional indices between existing values.
 *
 * @param options - Configuration options for the fractional indexing utility
 * @param cache - Optional cache to improve performance by reusing computed values
 * @returns A fractional indexing utility instance
 * @example
 * ```ts
 * // Create a decimal-based fractional indexing utility
 * const decimalFraci = fraci({
 *   digitBase: "0123456789",
 *   lengthBase: "abcdefghij"
 * });
 *
 * // Generate a key between null and null (first key)
 * const [key1] = decimalFraci.generateKeyBetween(null, null);
 * // Generate a key between key1 and null (key after key1)
 * const [key2] = decimalFraci.generateKeyBetween(key1, null);
 * // Generate a key between key1 and key2
 * const [key3] = decimalFraci.generateKeyBetween(key1, key2);
 * ```
 */
export function fraci<D extends string, L extends string, X>(
  {
    digitBase,
    lengthBase,
    maxLength = DEFAULT_MAX_LENGTH,
    maxRetries = DEFAULT_MAX_RETRIES,
  }: FraciOptions<D, L>,
  cache?: FraciCache
): Fraci<D, L, X> {
  type F = FractionalIndex<D, L, X>;

  // Create and potentially cache the digit and length base maps
  // This optimization avoids recreating these maps when using the same bases multiple times
  const [digBaseForward, digBaseReverse] = withCache(
    cache,
    `D${digitBase}`,
    createDigitBaseMap.bind(null, digitBase)
  );
  const [lenBaseForward, lenBaseReverse] = withCache(
    cache,
    `L${lengthBase}`,
    createIntegerLengthBaseMap.bind(null, lengthBase)
  );
  const smallestInteger = getSmallestInteger(digBaseForward, lenBaseForward);

  return {
    digitBase,
    lengthBase,
    *generateKeyBetween(a: F | null, b: F | null, skip = 0) {
      // Generate the base key between a and b (without conflict avoidance)
      const base = generateKeyBetween(
        a,
        b,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse,
        smallestInteger
      );
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same digitBase and lengthBase).
        throw new Error("Failed to generate index");
      }

      // Generate multiple possible keys with conflict avoidance suffixes
      // This allows the caller to try multiple keys if earlier ones conflict
      for (let i = 0; i < maxRetries; i++) {
        const value = `${base}${avoidConflictSuffix(i + skip, digBaseForward)}`;
        if (value.length > maxLength) {
          throw new Error("Exceeded maximum length");
        }
        yield value as F;
      }
    },
    *generateNKeysBetween(a: F | null, b: F | null, n: number, skip = 0) {
      // Generate n base keys between a and b (without conflict avoidance)
      const base = generateNKeysBetween(
        a,
        b,
        n,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse,
        smallestInteger
      );
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same digitBase and lengthBase).
        throw new Error("Failed to generate index");
      }

      // Find the longest key to ensure we don't exceed maxLength when adding suffixes
      const longest = base.reduce((acc, v) => Math.max(acc, v.length), 0);

      // Generate multiple sets of keys with conflict avoidance suffixes
      // Each set has the same suffix applied to all keys to maintain relative ordering
      for (let i = 0; i < maxRetries; i++) {
        const suffix = avoidConflictSuffix(i + skip, digBaseForward);
        if (longest + suffix.length > maxLength) {
          throw new Error("Exceeded maximum length");
        }
        yield base.map((v) => `${v}${suffix}` as F);
      }
    },
  };
}
