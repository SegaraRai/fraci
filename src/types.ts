import type { Fraci } from "./factory.js";
import type { FractionalIndex } from "./lib/types.js";

export type * from "./lib/types.js";

/**
 * Type alias for any Fraci instance with any digit base, length base, and brand.
 * This is useful for cases where the specific parameters don't matter.
 */
export type AnyFraci = Fraci<string, string, any>;

/**
 * Type alias for any fractional index with any digit base, length base, and brand.
 * This is useful for cases where the specific parameters don't matter.
 */
export type AnyFractionalIndex = FractionalIndex<string, string, any>;

/**
 * Extracts the Fraci type from a fractional index type.
 * This utility type infers the digit base, length base, and brand from a
 * fractional index type and constructs the corresponding Fraci type.
 *
 * @template F - The fractional index type to extract from
 */
export type FraciOf<F extends AnyFractionalIndex> = F extends FractionalIndex<
  infer D,
  infer L,
  infer X
>
  ? Fraci<D, L, X>
  : never;

/**
 * Extracts the fractional index type from a Fraci type.
 * This utility type infers the digit base, length base, and brand from a
 * Fraci type and constructs the corresponding fractional index type.
 *
 * @template F - The Fraci type to extract from
 */
export type FractionalIndexOf<F extends AnyFraci> = F extends Fraci<
  infer D,
  infer L,
  infer X
>
  ? FractionalIndex<D, L, X>
  : never;
