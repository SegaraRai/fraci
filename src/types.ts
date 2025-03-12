import type { Fraci } from "./factory.js";
import type { FractionalIndex } from "./lib/types.js";

export type * from "./lib/types.js";

export type AnyFraci = Fraci<string, string, any>;

export type AnyFractionalIndex = FractionalIndex<string, string, any>;

export type FraciOf<F extends AnyFractionalIndex> = F extends FractionalIndex<
  infer D,
  infer L,
  infer X
>
  ? Fraci<D, L, X>
  : never;

export type FractionalIndexOf<F extends AnyFraci> = F extends Fraci<
  infer D,
  infer L,
  infer X
>
  ? FractionalIndex<D, L, X>
  : never;
