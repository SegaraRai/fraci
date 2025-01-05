declare const fractionalIndexBrand: unique symbol;

/**
 * A branded string type representing a fractional index.
 *
 * **WARNING: DO NOT cast untrusted values to `FractionalIndex`, or your service may encounter runtime exceptions.**
 */
export type FractionalIndex<D extends string, L extends string, X> = string & {
  readonly [fractionalIndexBrand]: [D, L, X];
};
