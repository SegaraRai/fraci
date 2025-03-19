export type AnyBinaryFractionalIndexBase = {
  /**
   * The type of the fractional index.
   */
  readonly type: "binary";
};

export type AnyStringFractionalIndexBase = {
  /**
   * The type of the fractional index.
   */
  readonly type: "string";
  /**
   * The character set used for encoding the length of the integer part.
   */
  readonly lengthBase: string;
  /**
   * The character set used for representing digits in the fractional index.
   */
  readonly digitBase: string;
};

export type FractionalIndexBase =
  | AnyBinaryFractionalIndexBase
  | AnyStringFractionalIndexBase;

/**
 * A branded string type representing a fractional index.
 *
 * **WARNING: DO NOT cast untrusted values to `FractionalIndex`, or your service may encounter runtime exceptions.**
 *
 * @template B - The type of the base characters
 * @template X - The brand type for the fractional index
 */
export type FractionalIndex<
  B extends FractionalIndexBase,
  X
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

export type AnyBinaryFractionalIndex = FractionalIndex<
  AnyBinaryFractionalIndexBase,
  any
>;

export type AnyStringFractionalIndex = FractionalIndex<
  AnyStringFractionalIndexBase,
  any
>;

export type AnyFractionalIndex =
  | AnyBinaryFractionalIndex
  | AnyStringFractionalIndex;
