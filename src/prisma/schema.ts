import type { QualifiedFields } from "./prisma-types.js";

/**
 * The options for the binary fractional index fields.
 *
 * @template Group - The type of the name of the group fields
 *
 * @example { type: "binary", group: ["userId"] }
 *
 * @see {@link PrismaFraciFieldOptions} - The unified type for fractional index field options
 * @see {@link PrismaFraciFieldOptionsString} - The string fractional index field options
 * @see {@link PrismaFraciOptions} - The options for the fractional indexing extension
 */
export interface PrismaFraciFieldOptionsBinary<Group extends string = string> {
  /**
   * The type of the fractional index.
   * Must be "binary" for binary fractional indices.
   */
  readonly type: "binary";

  /**
   * The fields that define the grouping context for the fractional index.
   * This is an array of field names.
   */
  readonly group: readonly Group[];
}

/**
 * The options for the string fractional index fields.
 *
 * @template Group - The type of the name of the group fields
 *
 * @example { group: ["userId"], lengthBase: "0123456789", digitBase: "0123456789" }
 *
 * @see {@link PrismaFraciFieldOptions} - The unified type for fractional index field options
 * @see {@link PrismaFraciFieldOptionsBinary} - The binary fractional index field options
 * @see {@link PrismaFraciOptions} - The options for the fractional indexing extension
 */
export interface PrismaFraciFieldOptionsString<Group extends string = string> {
  /**
   * The type of the fractional index.
   * Must be "string" or `undefined` for string fractional indices.
   */
  readonly type?: "string" | undefined;

  /**
   * The fields that define the grouping context for the fractional index.
   * This is an array of field names.
   */
  readonly group: readonly Group[];

  /**
   * The character set used for encoding the length of the integer part.
   */
  readonly lengthBase: string;

  /**
   * The character set used for representing digits in the fractional index.
   */
  readonly digitBase: string;
}

/**
 * The options for the fractional index fields.
 *
 * @template Group - The type of the name of the group fields
 *
 * @example { group: ["userId", "title"], lengthBase: "0123456789", digitBase: "0123456789" }
 *
 * @see {@link PrismaFraciFieldOptionsBinary} - The binary fractional index field options
 * @see {@link PrismaFraciFieldOptionsString} - The string fractional index field options
 * @see {@link PrismaFraciOptions} - The options for the fractional indexing extension
 */
export type PrismaFraciFieldOptions<
  Group extends string = string,
  Mode extends "binary" | "string" = "binary" | "string",
> = {
  readonly binary: PrismaFraciFieldOptionsBinary<Group>;
  readonly string: PrismaFraciFieldOptionsString<Group>;
}[Mode];

/**
 * The record of the fractional index fields.
 *
 * @template Client - The Prisma client type
 *
 * @example { "article.fi": { group: ["userId"], lengthBase: "0123456789", digitBase: "0123456789" } }
 *
 * @see {@link PrismaFraciFieldOptions} - The unified type for fractional index field options
 * @see {@link PrismaFraciOptions} - The options for the fractional indexing extension
 */
export type PrismaFraciFieldOptionsRecord<Client> = {
  readonly [Q in QualifiedFields<Client>[0]]?:
    | PrismaFraciFieldOptions<
        Extract<QualifiedFields<Client>, [Q, any, any]>[1],
        Extract<QualifiedFields<Client>, [Q, any, any]>[2]
      >
    | undefined;
};

/**
 * The options for the fractional indexing extension.
 *
 * @template Client - The Prisma client type
 *
 * @example { fields: { "article.fi": { group: ["userId"], lengthBase: "0123456789", digitBase: "0123456789" } } }
 *
 * @see {@link PrismaFraciFieldOptions} - The unified type for fractional index field options
 * @see {@link PrismaFraciFieldOptionsRecord} - The record of the fractional index fields
 */
export interface PrismaFraciOptions<Client> {
  /**
   * The maximum number of retries to generate a fractional index.
   *
   * @default 5
   */
  readonly maxRetries?: number | undefined;

  /**
   * The maximum length of the fractional index.
   *
   * @default 50
   */
  readonly maxLength?: number | undefined;

  /**
   * The fractional index fields.
   */
  readonly fields: PrismaFraciFieldOptionsRecord<Client>;
}

/**
 * Creates a Prisma extension for fractional indexing.
 * This function defines the options for integrating fractional indexing
 * into a Prisma schema, including field configurations and performance settings.
 *
 * @template Client - The Prisma client type
 * @template Options - The options type
 *
 * @param _clientOrConstructor - The Prisma client or constructor. Only used for type inference and not used at runtime.
 * @param options - The options for the fractional indexing extension
 * @returns The options object with default values applied
 */
export function definePrismaFraci<
  Client,
  const Options extends PrismaFraciOptions<Client>,
>(
  _clientOrConstructor:
    | (new (...args: any) => Client)
    | ((...args: any) => Client)
    | Client,
  options: Options,
): Options {
  return options;
}
