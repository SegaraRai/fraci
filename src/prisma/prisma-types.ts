import type { Prisma } from "@prisma/client";

/**
 * A union of all model names.
 *
 * @template C - The Prisma client type
 *
 * @example "article" | "photo" | "user"
 */
export type ModelKey<C> = Extract<Exclude<keyof C, `$${string}`>, string>;

/**
 * The payload of a model containing only scalar fields.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 *
 * @example { id: number; title: string; content: string; fi: string; userId: number; createdAt: Date; updatedAt: Date }, where M = "article"
 */
export type ModelScalarPayload<C, M extends ModelKey<C>> =
  C extends Record<M, { [K: symbol]: { types: { payload: { scalars: any } } } }>
    ? C[M][symbol]["types"]["payload"]["scalars"]
    : never;

/**
 * A union of the field names of a model.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId" | "createdAt" | "updatedAt", where M = "article"
 */
export type AllModelFieldName<C, M extends ModelKey<C>> = Extract<
  keyof ModelScalarPayload<C, M>,
  string
>;

/**
 * A union of the field names of a model that are of type `T`.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 * @template T - The type of the field
 *
 * @example "title" | "content" | "fi", where M = "article" and T = string
 */
type ModelFieldNameByType<C, M extends ModelKey<C>, T> = {
  [F in AllModelFieldName<C, M>]: ModelScalarPayload<C, M>[F] extends T
    ? F
    : never;
}[AllModelFieldName<C, M>];

/**
 * A union of the field names of a model that are serializable.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId", where M = "article"
 */
type SerializableModelFieldName<
  C,
  M extends ModelKey<C>,
> = ModelFieldNameByType<C, M, boolean | bigint | number | string>;

/**
 * A union of the field names of a model that are of type `string`.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 *
 * @example "title" | "content" | "fi", where M = "User"
 */
export type StringModelFieldName<
  C,
  M extends ModelKey<C>,
> = ModelFieldNameByType<C, M, string>;

/**
 * A union of the field names of a model that are of type `Uint8Array`.
 *
 * @template C - The Prisma client type
 * @template M - The model name
 *
 * @example "title" | "content" | "fi", where M = "User"
 */
export type BinaryModelFieldName<
  C,
  M extends ModelKey<C>,
> = ModelFieldNameByType<C, M, Uint8Array>;

/**
 * A union of a tuple of 1) a qualified binary or string field key and 2) a union of the names of the other serializable fields of its model.
 *
 * @template C - The Prisma client type
 *
 * @example ["article.title", "id" | "content" | "fi" | "userId", "string"] | ["article.fi", "id" | "title" | "content" | "userId", "string"] | ... | ["user.fi", "id" | "name" | "email", "binary"] | ...
 */
export type QualifiedFields<C> = {
  [M in ModelKey<C>]:
    | {
        [F in BinaryModelFieldName<C, M>]: [
          `${M}.${F}`,
          Exclude<SerializableModelFieldName<C, M>, F>,
          "binary",
        ];
      }[BinaryModelFieldName<C, M>]
    | {
        [F in StringModelFieldName<C, M>]: [
          `${M}.${F}`,
          Exclude<SerializableModelFieldName<C, M>, F>,
          "string",
        ];
      }[StringModelFieldName<C, M>];
}[ModelKey<C>];

/**
 * The arguments for the `findMany` method of a Prisma model.
 *
 * @template M - The model name
 */
export type QueryArgs<C, M extends ModelKey<C> = ModelKey<C>> = Prisma.Args<
  C[M],
  "findMany"
>;
