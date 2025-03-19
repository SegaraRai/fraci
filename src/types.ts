import type { AnyFraci, Fraci } from "./factory.js";
import type { AnyFractionalIndex, FractionalIndex } from "./lib/types.js";

export type * from "./lib/types.js";

/**
 * Extracts the Fraci type from a fractional index type.
 * This utility type infers the digit base, length base, and brand from a
 * fractional index type and constructs the corresponding Fraci type.
 *
 * @template F - The fractional index type to extract from
 */
export type FraciOf<F extends AnyFractionalIndex> =
  F extends FractionalIndex<infer B, infer X> ? Fraci<B, X> : never;

/**
 * Extracts the fractional index type from a Fraci type.
 * This utility type infers the digit base, length base, and brand from a
 * Fraci type and constructs the corresponding fractional index type.
 *
 * @template F - The Fraci type to extract from
 */
export type FractionalIndexOf<F extends AnyFraci> =
  F extends Fraci<infer B, infer X> ? FractionalIndex<B, X> : never;
