// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `createFractionalIndexingExtension` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma, PrismaClient } from "@prisma/client/extension.js";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import {
  createFractionalIndexing,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  type FractionalIndexing,
} from "./factory.js";
import type { FractionalIndex } from "./lib/types.js";

const EXTENSION_NAME = "fractionalIndexing";

const PRISMA_CONFLICT_CODE = "P2002";

/**
 * A type-only unique symbol for branding Prisma models and fields.
 */
declare const PRISMA_BRAND: unique symbol;

/**
 * `PrismaClientKnownRequestError` of the conflict error.
 */
export type PrismaClientConflictError = PrismaClientKnownRequestError & {
  code: typeof PRISMA_CONFLICT_CODE;
  meta: { modelName: string; target: string[] };
};

/**
 * A brand for Prisma models and fields.
 *
 * @template M The model name.
 * @template F The field name.
 */
type PrismaBrand<M extends string, F extends string> = {
  [PRISMA_BRAND]: { model: M; field: F };
};

/**
 * A union of all model names.
 *
 * @example "article" | "photo" | "user"
 */
type ModelKey = Extract<Exclude<keyof PrismaClient, `$${string}`>, string>;

/**
 * The payload of a model containing only scalar fields.
 *
 * @template M The model name.
 * @example { id: number; title: string; content: string; fi: string; userId: number; createdAt: Date; updatedAt: Date }, where M = "article"
 */
type ModelScalarPayload<M extends ModelKey> =
  PrismaClient[M][symbol]["types"]["payload"]["scalars"];

/**
 * A union of the field names of a model.
 *
 * @template M The model name.
 * @example "id" | "title" | "content" | "fi" | "userId" | "createdAt" | "updatedAt", where M = "article"
 */
type AllModelFieldName<M extends ModelKey> = Extract<
  keyof ModelScalarPayload<M>,
  string
>;

/**
 * A union of the field names of a model that are of type `T`.
 *
 * @template M The model name.
 * @template T The type of the field.
 * @example "title" | "content" | "fi", where M = "article" and T = string
 */
type ModelFieldNameByType<M extends ModelKey, T> = {
  [F in AllModelFieldName<M>]: ModelScalarPayload<M>[F] extends T ? F : never;
}[AllModelFieldName<M>];

/**
 * A union of the field names of a model that are serializable.
 *
 * @template M The model name.
 * @example "id" | "title" | "content" | "fi" | "userId", where M = "article"
 */
type SerializableModelFieldName<M extends ModelKey> = ModelFieldNameByType<
  M,
  boolean | bigint | number | string
>;

/**
 * A union of the field names of a model that are of type `string`.
 *
 * @template M The model name.
 * @example "title" | "content" | "fi", where M = "User"
 */
type StringModelFieldName<M extends ModelKey> = ModelFieldNameByType<M, string>;

/**
 * A union of a tuple of 1) a qualified string field key and 2) a union of the names of the other serializable fields of its model.
 *
 * @example ["article.title", "id" | "content" | "fi" | "userId"] | ["article.fi", "id" | "title" | "content" | "userId"] | ... | ["user.name", "id" | "email"] | ...
 */
type QualifiedFields = {
  [M in ModelKey]: {
    [F in StringModelFieldName<M>]: [
      `${M}.${F}`,
      Exclude<SerializableModelFieldName<M>, F>
    ];
  }[StringModelFieldName<M>];
}[ModelKey];

type Indices<D extends string, L extends string, X> = [
  a: FractionalIndex<D, L, X> | null,
  b: FractionalIndex<D, L, X> | null
];

/**
 * Prisma client or transaction client.
 */
type AnyPrismaClient = PrismaClient | Prisma.TransactionClient;

/**
 * The arguments for the `findMany` method of a Prisma model.
 *
 * @template M The model name.
 */
type QueryArgs<M extends ModelKey> = Prisma.Args<PrismaClient[M], "findMany">;

/**
 * `FractionalIndexing` with the some additional methods for Prisma.
 */
type FractionalIndexingForPrisma<
  D extends string,
  L extends string,
  M extends ModelKey,
  W,
  X
> = FractionalIndexing<D, L, X> & {
  /**
   * Checks if the error is a conflict error for the fractional index.
   *
   * @param error The error to check.
   * @returns `true` if the error is a conflict error for the fractional index, or `false` otherwise.
   */
  isIndexConflictError(error: unknown): error is PrismaClientConflictError;
  /**
   * Gets the indices to generate a new fractional index for the item after the specified item.
   *
   * @param cursor The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the first item.
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item after the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  getIndicesAfter: {
    (
      cursor: QueryArgs<M>["cursor"],
      where: W & QueryArgs<M>["where"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X> | undefined>;
    (
      cursor: null,
      where: W & QueryArgs<M>["where"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X>>;
  };
  /**
   * Gets the indices to generate a new fractional index for the item before the specified item.
   *
   * @param cursor The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the last item.
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item before the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  getIndicesBefore: {
    (
      cursor: QueryArgs<M>["cursor"],
      where: W & QueryArgs<M>["where"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X> | undefined>;
    (
      cursor: null,
      where: W & QueryArgs<M>["where"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X>>;
  };
  /**
   * Gets the indices to generate a new fractional index for the first item.
   * Equivalent to `getIndicesAfter(null, where, client)`.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the first item.
   */
  getIndicesForFirst(
    where: W & QueryArgs<M>["where"],
    client?: AnyPrismaClient
  ): Promise<Indices<D, L, X>>;
  /**
   * Gets the indices to generate a new fractional index for the last item.
   * Equivalent to `getIndicesBefore(null, where, client)`.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the last item.
   */
  getIndicesForLast(
    where: W & QueryArgs<M>["where"],
    client?: AnyPrismaClient
  ): Promise<Indices<D, L, X>>;
};

/**
 * The options for the fractional index fields.
 *
 * @template T The type of the name of the group fields.
 * @example { group: ["userId", "title"], digitBase: "0123456789", lengthBase: "0123456789" }, where T = "userId" | "title"
 */
type FieldOptions<T extends string = string> = {
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
export interface FractionalIndexingExtensionOptions {
  /**
   * The maximum number of retries to generate a fractional index.
   *
   * @default 10
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

// Type definitions below are for the Prisma extension.
// Although it's easier to define the types without generics of `FractionalIndexingExtensionOptions` inside the function, we define them here to keep the function signature concise.

/**
 * A union of the pairs of the key and value of the `fields` property of the options.
 *
 * @template O The options type.
 * @example ["article.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ["photo.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ...
 */
type FieldsUnion<O extends FractionalIndexingExtensionOptions> = {
  [K in keyof O["fields"]]: [K, O["fields"][K]];
}[keyof O["fields"]];

/**
 * The field information for the Prisma extension.
 *
 * @template I The field options type.
 * @template M The model name.
 * @template W The type of the required fields for the `where` argument of the `findMany` method.
 * @template X The type of the fractional index brand.
 */
type FieldInfo<I extends FieldOptions, M extends ModelKey, W, X> = {
  readonly I: I;
  readonly value: FractionalIndex<I["digitBase"], I["lengthBase"], X>;
  readonly helper: FractionalIndexingForPrisma<
    I["digitBase"],
    I["lengthBase"],
    M,
    W,
    X
  >;
};

/**
 * The field information for each model.
 *
 * @template O The options type.
 */
type PerModelFieldInfo<O extends FractionalIndexingExtensionOptions> = {
  [M in ModelKey]: {
    [F in StringModelFieldName<M> as `${M}.${F}` extends FieldsUnion<O>[0]
      ? F
      : never]: FieldInfo<
      Extract<FieldsUnion<O>, [`${M}.${F}`, FieldOptions]>[1],
      M,
      Pick<
        ModelScalarPayload<M>,
        Extract<
          Extract<
            FieldsUnion<O>,
            [`${M}.${F}`, FieldOptions]
          >[1]["group"][number],
          AllModelFieldName<M>
        >
      >,
      PrismaBrand<M, F>
    >;
  };
};

/**
 * [model component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/model) of the Prisma extension.
 */
type ExtensionModel<O extends FractionalIndexingExtensionOptions> = {
  [M in keyof PerModelFieldInfo<O>]: {
    fractionalIndexing<F extends keyof PerModelFieldInfo<O>[M]>(
      field: F
    ): PerModelFieldInfo<O>[M][F]["helper"];
  };
};

/**
 * The type of our Prisma extension.
 *
 * @template O The options type.
 */
type Extension<O extends FractionalIndexingExtensionOptions> = {
  name: typeof EXTENSION_NAME;
  model: ExtensionModel<O>;
};

/**
 * Checks if the error is a conflict error for the fractional index.
 *
 * @param error The error object to check.
 * @param modelName The model name.
 * @param field The field name of the fractional index.
 * @returns `true` if the error is a conflict error for the fractional index, or `false` otherwise.
 */
function isIndexConflictError(
  error: unknown,
  modelName: string,
  field: string
): error is PrismaClientConflictError {
  return (
    error instanceof Error &&
    error.name === "PrismaClientKnownRequestError" &&
    (error as PrismaClientKnownRequestError).code === PRISMA_CONFLICT_CODE &&
    (error as any).meta?.modelName === modelName &&
    Array.isArray((error as any).meta?.target) &&
    (error as any).meta.target.includes(field)
  );
}

/**
 * Creates a Prisma extension for fractional indexing.
 *
 * @param param0 The options for the fractional indexing extension.
 * @returns The Prisma extension.
 */
export function createFractionalIndexingExtension<
  Options extends FractionalIndexingExtensionOptions
>({
  fields,
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: Options) {
  return Prisma.defineExtension((client) => {
    type HelperValue = FractionalIndexingForPrisma<any, any, any, any, any>;

    const helperMap = new Map<string, HelperValue>();

    for (const [modelAndField, { lengthBase, digitBase }] of Object.entries(
      fields
    ) as [string, FieldOptions][]) {
      const [model, field] = modelAndField.split(".", 2) as [ModelKey, string];

      const { modelName } = (client as any)[model]?.fields?.[field] ?? {};
      if (!modelName) {
        throw new Error(
          `Could not get field information for ${model}.${field}`
        );
      }

      const helper = createFractionalIndexing({
        digitBase,
        lengthBase,
        maxLength,
        maxRetries,
      });

      const getIndicesAfter = async (
        cursor: any,
        where: any,
        pClient: AnyPrismaClient = client
      ): Promise<any> => {
        if (!cursor) {
          const firstItem = await pClient[model].findFirst({
            where,
            select: { [field]: true },
            orderBy: { [field]: "asc" },
          });
          // We should always return a tuple of two indices if `cursor` is `null`.
          return [null, firstItem?.[field] ?? null];
        }

        const items = await pClient[model].findMany({
          cursor,
          where,
          select: { [field]: true },
          orderBy: { [field]: "asc" },
          take: 2,
        });
        return items.length < 1
          ? undefined
          : [items[0][field], items[1]?.[field] ?? null];
      };

      const getIndicesBefore = async (
        cursor: any,
        where: any,
        pClient: AnyPrismaClient = client
      ): Promise<any> => {
        if (!cursor) {
          const lastItem = await pClient[model].findFirst({
            where,
            select: { [field]: true },
            orderBy: { [field]: "desc" },
          });
          // We should always return a tuple of two indices if `cursor` is `null`.
          return [lastItem?.[field] ?? null, null];
        }

        const items = await pClient[model].findMany({
          cursor,
          where,
          select: { [field]: true },
          orderBy: { [field]: "desc" },
          take: 2,
        });
        return items.length < 1
          ? undefined
          : [items[1]?.[field] ?? null, items[0][field]];
      };

      const helperEx: HelperValue = {
        ...helper,
        isIndexConflictError: (
          error: unknown
        ): error is PrismaClientConflictError =>
          isIndexConflictError(error, modelName, field),
        getIndicesAfter,
        getIndicesBefore,
        getIndicesForFirst: (where: any, pClient?: AnyPrismaClient) =>
          getIndicesAfter(null, where, pClient),
        getIndicesForLast: (where: any, pClient?: AnyPrismaClient) =>
          getIndicesBefore(null, where, pClient),
      };

      helperMap.set(`${model}\0${field}`, helperEx);
    }

    const extensionModel = Object.create(null) as Record<ModelKey, unknown>;
    for (const model of Object.keys(client) as ModelKey[]) {
      if (model.startsWith("$") || model.startsWith("_")) {
        continue;
      }

      extensionModel[model] = {
        fractionalIndexing(field: string) {
          return helperMap.get(`${model}\0${field}`)!;
        },
      };
    }

    return client.$extends({
      name: EXTENSION_NAME,
      model: extensionModel,
    } as unknown as Extension<Options>);
  });
}
