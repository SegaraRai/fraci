import type {
  BASE10,
  BASE16L,
  BASE16U,
  BASE26L,
  BASE26U,
  BASE36L,
  BASE36U,
  BASE52,
  BASE62,
  BASE64URL,
  BASE88,
  BASE95,
} from "./bases.js";
import { concat } from "./lib/decimal-binary.js";
import { getSmallestInteger } from "./lib/decimal-string.js";
import {
  avoidConflictSuffix as avoidConflictSuffixBinary,
  generateKeyBetween as generateKeyBetweenBinary,
  generateNKeysBetween as generateNKeysBetweenBinary,
} from "./lib/fractional-indexing-binary.js";
import {
  avoidConflictSuffix,
  generateKeyBetween,
  generateNKeysBetween,
} from "./lib/fractional-indexing-string.js";
import type {
  AnyBinaryFractionalIndexBase,
  AnyStringFractionalIndexBase,
  FractionalIndex,
  FractionalIndexBase,
} from "./lib/types.js";
import { createDigitBaseMap, createIntegerLengthBaseMap } from "./lib/utils.js";

/**
 * Default maximum length for fractional index keys.
 */
export const DEFAULT_MAX_LENGTH = 50;

/**
 * Default maximum number of retry attempts when generating keys.
 */
export const DEFAULT_MAX_RETRIES = 5;

const ERROR_MESSAGE_INVALID_INPUT = "Fraci: Invalid indices provided";

const ERROR_MESSAGE_EXCEEDED_MAX_LENGTH = "Fraci: Exceeded maximum length";

type IndexPairs<T> =
  | [T | null, T | null]
  | [T | null, T]
  | [T | null, null]
  | [T, T | null]
  | [T, T]
  | [T, null]
  | [null, T | null]
  | [null, T]
  | [null, null];

/**
 * Fractional indexing utility that provides methods for generating ordered keys.
 *
 * @template B - The base configuration defining the encoding strategy
 * @template X - The brand type for the fractional index
 *
 * @see {@link fraci} - The unified factory function for creating fractional indexing utilities
 * @see {@link fraciBinary} - The factory function for creating binary-based fractional indexing utilities
 * @see {@link fraciString} - The factory function for creating string-based fractional indexing utilities
 */
export interface Fraci<B extends FractionalIndexBase, X> {
  /**
   * The character sets used for representing digits in the fractional index.
   */
  readonly base: B;

  /**
   * The brand type for the fractional index. Does not exist at runtime.
   *
   * @internal
   */
  readonly brand?: X | undefined;

  /**
   * Generates a key between two existing keys.
   * Returns a generator that yields new unique keys between the provided bounds.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding fractional index keys
   * @throws {Error} When invalid input is provided
   * @throws {Error} When the generated key exceeds the maximum length
   */
  generateKeyBetween(
    a: FractionalIndex<B, X> | null,
    b: FractionalIndex<B, X> | null,
    skip?: number,
  ): Generator<FractionalIndex<B, X>, void, unknown>;

  /**
   * Generates a key between two existing keys.
   * Returns a generator that yields new unique keys between the provided bounds.
   *
   * This is an overload to make the spread operator work with conditional tuples.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding fractional index keys
   * @throws {Error} When invalid input is provided
   * @throws {Error} When the generated key exceeds the maximum length
   *
   * @ignore Documentation should be ignored for this overload but should not affect functionality and Intellisense
   */
  generateKeyBetween(
    ...[a, b, skip]:
      | [...IndexPairs<FractionalIndex<B, X>>]
      | [...IndexPairs<FractionalIndex<B, X>>, number]
  ): Generator<FractionalIndex<B, X>, void, unknown>;

  /**
   * Generates multiple keys evenly distributed between two existing keys.
   * Returns a generator that yields arrays of new unique keys.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param n - Number of keys to generate
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding arrays of fractional index keys
   * @throws {Error} When invalid input is provided
   * @throws {Error} When the generated keys would exceed the maximum length
   */
  generateNKeysBetween(
    a: FractionalIndex<B, X> | null,
    b: FractionalIndex<B, X> | null,
    n: number,
    skip?: number,
  ): Generator<FractionalIndex<B, X>[], void, unknown>;

  /**
   * Generates multiple keys evenly distributed between two existing keys.
   * Returns a generator that yields arrays of new unique keys.
   *
   * This is an overload to make the spread operator work with conditional tuples.
   *
   * @param a - The lower bound key, or null if there is no lower bound
   * @param b - The upper bound key, or null if there is no upper bound
   * @param n - Number of keys to generate
   * @param skip - Number of conflict avoidance iterations to skip (default: 0)
   * @returns A generator yielding arrays of fractional index keys
   * @throws {Error} When invalid input is provided
   * @throws {Error} When the generated keys would exceed the maximum length
   *
   * @ignore Documentation should be ignored for this overload but should not affect functionality and Intellisense
   */
  generateNKeysBetween(
    ...[a, b, n, skip]:
      | [...IndexPairs<FractionalIndex<B, X>>, number]
      | [...IndexPairs<FractionalIndex<B, X>>, number, number]
  ): Generator<FractionalIndex<B, X>[], void, unknown>;
}

/**
 * Type alias for any {@link Fraci} instance with a binary digit base.
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link AnyFraci} - A union type of all fractional index types
 * @see {@link AnyStringFraci} - The type of all string fractional index types
 */
export type AnyBinaryFraci = Fraci<AnyBinaryFractionalIndexBase, any>;

/**
 * Type alias for any {@link Fraci} instance with a string digit base.
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link AnyFraci} - A union type of all fractional index types
 * @see {@link AnyBinaryFraci} - The type of all binary fractional index types
 */
export type AnyStringFraci = Fraci<AnyStringFractionalIndexBase, any>;

/**
 * Type alias for any {@link Fraci} instance with any digit base, length base, and brand.
 * This is useful for cases where the specific parameters don't matter.
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link AnyBinaryFraci} - The type of all binary fractional index types
 * @see {@link AnyStringFraci} - The type of all string fractional index types
 */
export type AnyFraci = AnyBinaryFraci | AnyStringFraci;

/**
 * Base options for fractional indexing.
 *
 * This type serves as the base type for the `B` template parameter in the {@link Fraci} type,
 * defining the encoding strategy used by the index.
 *
 * @see {@link FraciOptions} - The main configuration options for fractional indexing
 * @see {@link FraciOptionsBaseToBase} - The type alias for converting options to a more specific type
 */
export type FraciOptionsBase =
  | {
      /**
       * The type discriminator identifying this as a string fractional index configuration.
       *
       * Must be "string" or `undefined` for string fractional indices.
       */
      readonly type?: "string" | undefined;

      /**
       * The character set used for encoding the length of the integer part.
       *
       * This determines what characters are used to represent the length of the integer
       * portion of the fractional index. Characters must be in ascending lexicographic order.
       *
       * The first character of a fractional index comes from this character set.
       *
       * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
       */
      readonly lengthBase: string;

      /**
       * The character set used for representing digits in the fractional index.
       *
       * These characters form the ordered set used to encode the actual index values,
       * and must be in ascending lexicographic order.
       *
       * The second and all subsequent characters of a fractional index come from this character set.
       *
       * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
       */
      readonly digitBase: string;
    }
  | {
      /**
       * The type discriminator identifying this as a binary fractional index configuration.
       *
       * Must be "binary" for binary fractional indices.
       */
      readonly type: "binary";
    };

/**
 * Type alias for converting the options to a more specific type.
 *
 * @template B - The base configuration defining the encoding strategy
 *
 * @see {@link FraciOptionsBase} - The base options for fractional indexing
 * @see {@link FractionalIndexBase} - The base configuration for fractional indices
 */
export type FraciOptionsBaseToBase<B extends FraciOptionsBase> = B extends {
  readonly lengthBase: string;
  readonly digitBase: string;
}
  ? {
      /**
       * The type discriminator identifying this as a string fractional index configuration.
       */
      readonly type: "string";

      /**
       * The character set used for encoding the length of the integer part.
       *
       * This determines what characters are used to represent the length of the integer
       * portion of the fractional index. Characters must be in ascending lexicographic order.
       *
       * The first character of a fractional index comes from this character set.
       *
       * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
       */
      readonly lengthBase: B["lengthBase"];

      /**
       * The character set used for representing digits in the fractional index.
       *
       * These characters form the ordered set used to encode the actual index values,
       * and must be in ascending lexicographic order.
       *
       * The second and all subsequent characters of a fractional index come from this character set.
       *
       * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
       */
      readonly digitBase: B["digitBase"];
    }
  : {
      /**
       * The type discriminator identifying this as a binary fractional index configuration.
       */
      readonly type: "binary";
    };

/**
 * Configuration options for creating fractional indexing utilities.
 *
 * @template B - The base configuration defining the encoding strategy
 *
 * @see {@link fraci} - The unified factory function for creating fractional indexing utilities
 * @see {@link FraciOptionsBase} - The base options for fractional indexing
 * @see {@link BinaryFraciOptions} - The options for binary fractional indexing
 * @see {@link StringFraciOptions} - The options for string fractional indexing
 */
export type FraciOptions<B extends FraciOptionsBase> = B & {
  /**
   * Maximum allowed length for generated keys.
   * @default DEFAULT_MAX_LENGTH (50)
   */
  readonly maxLength?: number | undefined;

  /**
   * Maximum number of retry attempts when generating keys.
   * @default DEFAULT_MAX_RETRIES (5)
   */
  readonly maxRetries?: number | undefined;
};

/**
 * Base configuration for creating string-based fractional indexing utilities.
 *
 * Defines the configuration for fractional indices represented using binary encoding,
 * where indices are stored as byte arrays (`Uint8Array`).
 *
 * Binary indices generally provide more compact storage and efficient comparison operations
 * compared to string-based alternatives.
 *
 * @see {@link FraciOptions} - The main configuration options for fractional indexing
 * @see {@link StringFraciOptions} - The options for string fractional indexing
 */
export type BinaryFraciOptions = FraciOptions<{
  /**
   * The type discriminator identifying this as a binary fractional index configuration.
   */
  readonly type: "binary";
}>;

/**
 * Base configuration for creating string-based fractional indexing utilities.
 *
 * Defines the configuration for fractional indices represented using string encoding,
 * where indices are stored as human-readable strings using specified character sets.
 *
 * String indices are useful when human readability or sortability in standard string
 * contexts (like databases) is required.
 *
 * @see {@link FraciOptions} - The main configuration options for fractional indexing
 * @see {@link BinaryFraciOptions} - The options for binary fractional indexing
 */
export type StringFraciOptions = FraciOptions<{
  /**
   * The type discriminator identifying this as a string fractional index configuration.
   */
  readonly type?: "string" | undefined;

  /**
   * The character set used for encoding the length of the integer part.
   *
   * This determines what characters are used to represent the length of the integer
   * portion of the fractional index. Characters must be in ascending lexicographic order.
   *
   * The first character of a fractional index comes from this character set.
   *
   * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
   */
  readonly lengthBase: string;

  /**
   * The character set used for representing digits in the fractional index.
   *
   * These characters form the ordered set used to encode the actual index values,
   * and must be in ascending lexicographic order.
   *
   * The second and all subsequent characters of a fractional index come from this character set.
   *
   * @see {@link BASE10}, {@link BASE16L}, {@link BASE16U}, {@link BASE26L}, {@link BASE26U}, {@link BASE36L}, {@link BASE36U}, {@link BASE52}, {@link BASE62}, {@link BASE64URL}, {@link BASE88}, {@link BASE95}
   */
  readonly digitBase: string;
}>;

/**
 * Type alias to represent options that can be branded.
 *
 * @template T - The base options type
 * @template X - The brand type
 */
type BrandableOptions<T, X> = T & {
  /**
   * The brand type for the fractional index.
   */
  readonly brand?: X | undefined;
};

/**
 * Cache for storing computed values to improve performance.
 * Uses a branded type pattern to prevent accidental misuse.
 *
 * @see {@link createFraciCache} - Function to create a new cache
 */
export type FraciCache = Map<string, unknown> & { readonly __fraci__: never };

/**
 * Creates a new empty {@link FraciCache} for storing computed values in string-based fractional indexing operations.
 * Using a cache can improve initialization performance when repeatedly using the same base configurations.
 *
 * @returns A new empty FraciCache instance
 *
 * @example
 * ```typescript
 * const cache = createFraciCache();
 * const fraci1 = fraciString({ brand: "a", lengthBase: "abcdefghij", digitBase: "0123456789" }, cache);
 * const fraci2 = fraciString({ brand: "b", lengthBase: "abcdefghij", digitBase: "0123456789" }, cache);
 * // Both instances will share cached computations
 * ```
 */
export function createFraciCache(): FraciCache {
  return new Map() as FraciCache;
}

/**
 * Retrieves a value from cache or computes it if not present.
 *
 * @template T - The type of the value to cache
 *
 * @param cache - The cache to use, or undefined to bypass caching
 * @param key - The cache key to look up
 * @param fn - Function to execute if the value is not in the cache
 * @returns The cached or newly computed value
 */
function withCache<T>(
  cache: FraciCache | undefined,
  key: string,
  fn: () => T,
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

function logInvalidInputError(
  a: string | Uint8Array | null,
  b: string | Uint8Array | null,
  skip: number,
): void {
  if (globalThis.__DEV__) {
    console.error(
      `Fraci: Invalid indices provided. a = ${a}, b = ${b}, skip = ${skip}
Make sure that
- Fractional indices generated by the same fraci instance with the same configuration are being used as-is
- Indices in different groups have not been mixed up
- a (the first argument item) comes before b (the second argument item) in the group
File an issue if you use the library correctly and still encounter this error.`,
    );
  }
}

/**
 * Creates a binary-based fractional indexing utility with the specified configuration.
 *
 * @template X - The brand type for the fractional index
 *
 * @param options - Configuration options for the fractional indexing utility
 * @returns A binary-based fractional indexing utility instance
 *
 * @example
 * ```typescript
 * // Create a binary-based fractional indexing utility
 * const binaryFraci = fraciBinary({ brand: "exampleIndex" });
 *
 * // Generate a key between null and null (first key)
 * const [key1] = binaryFraci.generateKeyBetween(null, null);
 * // Generate a key between key1 and null (key after key1)
 * const [key2] = binaryFraci.generateKeyBetween(key1, null);
 * // Generate a key between key1 and key2
 * const [key3] = binaryFraci.generateKeyBetween(key1, key2);
 * ```
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link BinaryFraciOptions} - The options for the binary fractional indexing utility
 * @see {@link fraci} - The unified factory function for creating fractional indexing utilities
 * @see {@link fraciString} - The factory function for creating string-based fractional indexing utilities
 */
export function fraciBinary<const X = unknown>({
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: BrandableOptions<
  Omit<BinaryFraciOptions, "type"> & { readonly type?: "binary" | undefined },
  X
> = {}): Fraci<AnyBinaryFractionalIndexBase, X> {
  type F = FractionalIndex<AnyBinaryFractionalIndexBase, X>;

  return {
    base: { type: "binary" },
    *generateKeyBetween(a: F | null, b: F | null, skip = 0) {
      // Generate the base key between a and b (without conflict avoidance)
      const base = generateKeyBetweenBinary(a, b);
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same lengthBase and digitBase).
        if (globalThis.__DEV__) {
          logInvalidInputError(a, b, skip);
        }
        throw new Error(ERROR_MESSAGE_INVALID_INPUT);
      }

      // Generate multiple possible keys with conflict avoidance suffixes
      // This allows the caller to try multiple keys if earlier ones conflict
      for (let i = 0; i < maxRetries; i++) {
        const value = concat(base, avoidConflictSuffixBinary(i + skip));
        if (value.length > maxLength) {
          throw new Error(ERROR_MESSAGE_EXCEEDED_MAX_LENGTH);
        }
        yield value as F;
      }
    },
    *generateNKeysBetween(a: F | null, b: F | null, n: number, skip = 0) {
      // Generate n base keys between a and b (without conflict avoidance)
      const base = generateNKeysBetweenBinary(a, b, n);
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same lengthBase and digitBase).
        if (globalThis.__DEV__) {
          logInvalidInputError(a, b, skip);
        }
        throw new Error(ERROR_MESSAGE_INVALID_INPUT);
      }

      // Find the longest key to ensure we don't exceed maxLength when adding suffixes
      const longest = base.reduce((acc, v) => Math.max(acc, v.length), 0);

      // Generate multiple sets of keys with conflict avoidance suffixes
      // Each set has the same suffix applied to all keys to maintain relative ordering
      for (let i = 0; i < maxRetries; i++) {
        const suffix = avoidConflictSuffixBinary(i + skip);
        if (longest + suffix.length > maxLength) {
          throw new Error(ERROR_MESSAGE_EXCEEDED_MAX_LENGTH);
        }
        yield base.map((v) => concat(v, suffix) as F);
      }
    },
  };
}

/**
 * Creates a string-based fractional indexing utility with the specified configuration.
 *
 * @template B - The base configuration defining the character sets
 * @template X - The brand type for the fractional index
 *
 * @param options - Configuration options for the fractional indexing utility
 * @param cache - Optional cache to improve performance by reusing computed values
 * @returns A string-based fractional indexing utility instance
 * @throws {Error} When the digit or length base strings are invalid
 *
 * @example
 * ```typescript
 * // Create a decimal-based fractional indexing utility
 * const decimalFraci = fraciString({
 *   brand: "exampleIndex",
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
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link StringFraciOptions} - The options for the string fractional indexing utility
 * @see {@link FraciCache} - The cache for storing computed values
 * @see {@link fraci} - The unified factory function for creating fractional indexing utilities
 * @see {@link fraciBinary} - The factory function for creating binary-based fractional indexing utilities
 */
export function fraciString<
  const B extends StringFraciOptions,
  const X = unknown,
>(
  {
    lengthBase,
    digitBase,
    maxLength = DEFAULT_MAX_LENGTH,
    maxRetries = DEFAULT_MAX_RETRIES,
  }: BrandableOptions<B, X>,
  cache?: FraciCache,
): Fraci<FraciOptionsBaseToBase<B>, X> {
  type F = FractionalIndex<FraciOptionsBaseToBase<B>, X>;

  // Create and potentially cache the digit and length base maps
  // This optimization avoids recreating these maps when using the same bases multiple times
  const [lenBaseForward, lenBaseReverse] = withCache(
    cache,
    `L${lengthBase}`,
    createIntegerLengthBaseMap.bind(null, lengthBase),
  );
  const [digBaseForward, digBaseReverse] = withCache(
    cache,
    `D${digitBase}`,
    createDigitBaseMap.bind(null, digitBase),
  );
  const smallestInteger = getSmallestInteger(digBaseForward, lenBaseForward);

  return {
    base: {
      type: "string",
      lengthBase,
      digitBase,
    } as FraciOptionsBaseToBase<B>,
    *generateKeyBetween(a: F | null, b: F | null, skip = 0) {
      // Generate the base key between a and b (without conflict avoidance)
      const base = generateKeyBetween(
        a,
        b,
        digBaseForward,
        digBaseReverse,
        lenBaseForward,
        lenBaseReverse,
        smallestInteger,
      );
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same lengthBase and digitBase).
        if (globalThis.__DEV__) {
          logInvalidInputError(a, b, skip);
        }
        throw new Error(ERROR_MESSAGE_INVALID_INPUT);
      }

      // Generate multiple possible keys with conflict avoidance suffixes
      // This allows the caller to try multiple keys if earlier ones conflict
      for (let i = 0; i < maxRetries; i++) {
        const value = `${base}${avoidConflictSuffix(i + skip, digBaseForward)}`;
        if (value.length > maxLength) {
          throw new Error(ERROR_MESSAGE_EXCEEDED_MAX_LENGTH);
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
        smallestInteger,
      );
      if (!base) {
        // Logic Error. Should not happen if a and b are valid (i.e. generated by this library with same lengthBase and digitBase).
        if (globalThis.__DEV__) {
          logInvalidInputError(a, b, skip);
        }
        throw new Error(ERROR_MESSAGE_INVALID_INPUT);
      }

      // Find the longest key to ensure we don't exceed maxLength when adding suffixes
      const longest = base.reduce((acc, v) => Math.max(acc, v.length), 0);

      // Generate multiple sets of keys with conflict avoidance suffixes
      // Each set has the same suffix applied to all keys to maintain relative ordering
      for (let i = 0; i < maxRetries; i++) {
        const suffix = avoidConflictSuffix(i + skip, digBaseForward);
        if (longest + suffix.length > maxLength) {
          throw new Error(ERROR_MESSAGE_EXCEEDED_MAX_LENGTH);
        }
        yield base.map((v) => `${v}${suffix}` as F);
      }
    },
  };
}

/**
 * **We recommend using {@link fraciBinary} or {@link fraciString} directly to reduce bundle size whenever possible.**
 *
 * Creates a fractional indexing utility with the specified configuration.
 * This is the main factory function for creating a {@link Fraci} instance that can generate
 * fractional indices between existing values.
 *
 * @template B - The base configuration defining the encoding strategy
 * @template X - The brand type for the fractional index
 *
 * @param options - Configuration options for the fractional indexing utility
 * @param cache - Optional cache to improve performance by reusing computed values
 * @returns A fractional indexing utility instance
 * @throws {Error} When the digit or length base strings are invalid
 *
 * @example
 * ```typescript
 * // Create a decimal-based fractional indexing utility
 * const decimalFraci = fraci({
 *   brand: "exampleIndex",
 *   lengthBase: "abcdefghij"
 *   digitBase: "0123456789",
 * });
 *
 * // Generate a key between null and null (first key)
 * const [key1] = decimalFraci.generateKeyBetween(null, null);
 * // Generate a key between key1 and null (key after key1)
 * const [key2] = decimalFraci.generateKeyBetween(key1, null);
 * // Generate a key between key1 and key2
 * const [key3] = decimalFraci.generateKeyBetween(key1, key2);
 * ```
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 * @see {@link fraciBinary} - The factory function for creating binary-based fractional indexing utilities
 * @see {@link fraciString} - The factory function for creating string-based fractional indexing utilities
 */
export function fraci<const B extends FraciOptionsBase, const X = unknown>(
  options: FraciOptions<B> | (FraciOptions<B> & { readonly brand: X }),
  cache?: FraciCache,
): Fraci<FraciOptionsBaseToBase<B>, X> {
  if (options.type === "binary") {
    if (globalThis.__DEV__) {
      if (cache) {
        console.warn("Fraci: Cache is not used for binary base");
      }
    }
    return fraciBinary(options) as Fraci<FraciOptionsBaseToBase<B>, X>;
  }

  return fraciString(options, cache) as Fraci<FraciOptionsBaseToBase<B>, X>;
}
