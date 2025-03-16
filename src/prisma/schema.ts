import type { QualifiedFields } from "./prisma-types.js";

/**
 * The options for the fractional index fields.
 *
 * @template T - The type of the name of the group fields
 *
 * @example { group: ["userId", "title"], digitBase: "0123456789", lengthBase: "0123456789" }, where T = "userId" | "title"
 */
export type FieldOptions<T extends string = string> = {
  readonly group: readonly T[];
  readonly digitBase: string;
  readonly lengthBase: string;
};

/**
 * The record of the fractional index fields.
 *
 * @example { "article.fi": { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" } }
 */
type FieldOptionsRecord = {
  readonly [Q in QualifiedFields[0]]?: FieldOptions<
    Extract<QualifiedFields, [Q, any]>[1]
  >;
};

/**
 * The options for the fractional indexing extension.
 */
export interface PrismaFraciOptions {
  /**
   * The maximum number of retries to generate a fractional index.
   *
   * @default 5
   */
  readonly maxRetries?: number;

  /**
   * The maximum length of the fractional index.
   *
   * @default 50
   */
  readonly maxLength?: number;

  /**
   * The fractional index fields.
   */
  readonly fields: FieldOptionsRecord;
}

/**
 * Creates a Prisma extension for fractional indexing.
 * This function defines the options for integrating fractional indexing
 * into a Prisma schema, including field configurations and performance settings.
 *
 * @template Options - The options type
 *
 * @param options - The options for the fractional indexing extension
 * @returns The options object with default values applied
 */
export function definePrismaFraci<Options extends PrismaFraciOptions>(
  options: Options
): Options {
  return options;
}
