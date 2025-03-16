import { Prisma, PrismaClient } from "@prisma/client/extension.js";
import type { FractionalIndex } from "../lib/types.js";

/**
 * A union of all model names.
 *
 * @example "article" | "photo" | "user"
 */
export type ModelKey = Extract<
  Exclude<keyof PrismaClient, `$${string}`>,
  string
>;

/**
 * The payload of a model containing only scalar fields.
 *
 * @template M - The model name
 *
 * @example { id: number; title: string; content: string; fi: string; userId: number; createdAt: Date; updatedAt: Date }, where M = "article"
 */
export type ModelScalarPayload<M extends ModelKey> =
  PrismaClient[M][symbol]["types"]["payload"]["scalars"];

/**
 * A union of the field names of a model.
 *
 * @template M - The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId" | "createdAt" | "updatedAt", where M = "article"
 */
export type AllModelFieldName<M extends ModelKey> = Extract<
  keyof ModelScalarPayload<M>,
  string
>;

/**
 * A union of the field names of a model that are of type `T`.
 *
 * @template M - The model name
 * @template T - The type of the field
 *
 * @example "title" | "content" | "fi", where M = "article" and T = string
 */
export type ModelFieldNameByType<M extends ModelKey, T> = {
  [F in AllModelFieldName<M>]: ModelScalarPayload<M>[F] extends T ? F : never;
}[AllModelFieldName<M>];

/**
 * A union of the field names of a model that are serializable.
 *
 * @template M The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId", where M = "article"
 */
export type SerializableModelFieldName<M extends ModelKey> =
  ModelFieldNameByType<M, boolean | bigint | number | string>;

/**
 * A union of the field names of a model that are of type `string`.
 *
 * @template M The model name
 *
 * @example "title" | "content" | "fi", where M = "User"
 */
export type StringModelFieldName<M extends ModelKey> = ModelFieldNameByType<
  M,
  string
>;

/**
 * A union of a tuple of 1) a qualified string field key and 2) a union of the names of the other serializable fields of its model.
 *
 * @example ["article.title", "id" | "content" | "fi" | "userId"] | ["article.fi", "id" | "title" | "content" | "userId"] | ... | ["user.name", "id" | "email"] | ...
 */
export type QualifiedFields = {
  [M in ModelKey]: {
    [F in StringModelFieldName<M>]: [
      `${M}.${F}`,
      Exclude<SerializableModelFieldName<M>, F>
    ];
  }[StringModelFieldName<M>];
}[ModelKey];

/**
 * A tuple of two fractional indices, used for generating a new index between them.
 */
export type Indices<D extends string, L extends string, X> = [
  a: FractionalIndex<D, L, X> | null,
  b: FractionalIndex<D, L, X> | null
];

/**
 * Prisma client or transaction client.
 */
export type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

/**
 * The arguments for the `findMany` method of a Prisma model.
 *
 * @template M - The model name
 */
export type QueryArgs<M extends ModelKey> = Prisma.Args<
  PrismaClient[M],
  "findMany"
>;
