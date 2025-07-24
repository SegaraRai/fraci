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
} from "../bases.js";

/**
 * Base configuration for binary fractional index implementations.
 *
 * Defines the configuration for fractional indices represented using binary encoding,
 * where indices are stored as byte arrays (`Uint8Array`).
 *
 * Binary indices generally provide more compact storage and efficient comparison operations
 * compared to string-based alternatives.
 *
 * @see {@link FractionalIndexBase} - Base configuration for fractional indices
 * @see {@link AnyStringFractionalIndexBase} - Base configuration for string-based fractional indices
 */
export type AnyBinaryFractionalIndexBase = {
  /**
   * The type discriminator identifying this as a binary fractional index configuration.
   */
  readonly type: "binary";
};

/**
 * Base configuration for string-based fractional index implementations.
 *
 * Defines the configuration for fractional indices represented using string encoding,
 * where indices are stored as human-readable strings using specified character sets.
 *
 * String indices are useful when human readability or sortability in standard string
 * contexts (like databases) is required.
 *
 * @see {@link FractionalIndexBase} - Base configuration for fractional indices
 * @see {@link AnyBinaryFractionalIndexBase} - Base configuration for binary-based fractional indices
 */
export type AnyStringFractionalIndexBase = {
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
};

/**
 * Base configuration for fractional index implementations.
 *
 * This type serves as the base type for the `B` template parameter in the {@link FractionalIndex} type,
 * defining the encoding strategy used by the index.
 *
 * @see {@link FractionalIndex} - The main type for fractional indices
 */
export type FractionalIndexBase =
  | AnyBinaryFractionalIndexBase
  | AnyStringFractionalIndexBase;

/**
 * A branded type representing a fractional index with encoding strategy based on the base configuration.
 *
 * **WARNING: DO NOT cast untrusted values to `FractionalIndex` as this may cause runtime exceptions.**
 *
 * @template B - The base configuration defining the encoding strategy
 * @template X - The brand type for type safety and identification
 *
 * @see {@link FractionalIndex} - The main type for fractional indices
 * @see {@link AnyBinaryFractionalIndex} - A type representing any binary fractional index
 * @see {@link AnyStringFractionalIndex} - A type representing any string fractional index
 */
export type FractionalIndex<
  B extends FractionalIndexBase,
  X,
> = (B extends AnyBinaryFractionalIndexBase ? Uint8Array : string) & {
  /**
   * Branding information for the fractional index. Does not exist at runtime.
   * @internal
   */
  readonly __fraci__: {
    readonly brand: X;
    readonly base: B;
  };
};

/**
 * Represents any binary-encoded fractional index.
 *
 * Binary fractional indices are implemented as Uint8Array objects with additional
 * type information. They provide compact representation and efficient comparison
 * operations compared to string-based indices.
 *
 * This type is commonly used when you need to work with binary fractional indices
 * without knowing their specific brand type.
 *
 * @see {@link AnyFractionalIndex} - A type representing any fractional index
 * @see {@link AnyStringFractionalIndex} - A type representing any string fractional index
 */
export type AnyBinaryFractionalIndex = FractionalIndex<
  AnyBinaryFractionalIndexBase,
  any
>;

/**
 * Represents any string-encoded fractional index.
 *
 * String fractional indices are implemented as string values with additional
 * type information. They provide human-readable representation and natural
 * lexicographic sorting in string-based storage systems.
 *
 * This type is commonly used when you need to work with string fractional indices
 * without knowing their specific brand type.
 *
 * @see {@link AnyFractionalIndex} - A type representing any fractional index
 * @see {@link AnyBinaryFractionalIndex} - A type representing any binary fractional index
 */
export type AnyStringFractionalIndex = FractionalIndex<
  AnyStringFractionalIndexBase,
  any
>;

/**
 * Represents any fractional index regardless of encoding strategy.
 *
 * This union type encompasses both binary and string fractional indices,
 * allowing operations that can work with any fractional index implementation.
 *
 * Use this type for generic algorithms and functions that should accept
 * any fractional index without being tied to a specific encoding strategy.
 */
export type AnyFractionalIndex =
  | AnyBinaryFractionalIndex
  | AnyStringFractionalIndex;
