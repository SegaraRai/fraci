/**
 * A branded string type representing a fractional index.
 *
 * **WARNING: DO NOT cast untrusted values to `FractionalIndex`, or your service may encounter runtime exceptions.**
 *
 * @template D - The type of the digit base characters
 * @template L - The type of the length base characters
 * @template X - The brand type for the fractional index
 */
export type FractionalIndex<D extends string, L extends string, X> = string & {
  readonly __fraci__: [D, L, X];
};
