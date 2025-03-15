// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `prismaFraci` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma, PrismaClient } from "@prisma/client/extension.js";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import {
  createFraciCache,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  fraci,
  type Fraci,
} from "./factory.js";
import type { FractionalIndex } from "./types.js";

const EXTENSION_NAME = "fraci";

const PRISMA_CONFLICT_CODE = "P2002";

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
 * @template M The model name
 * @template F The field name
 */
type PrismaBrand<M extends string, F extends string> = {
  readonly __prisma__: { model: M; field: F };
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
 * @template M The model name
 *
 * @example { id: number; title: string; content: string; fi: string; userId: number; createdAt: Date; updatedAt: Date }, where M = "article"
 */
type ModelScalarPayload<M extends ModelKey> =
  PrismaClient[M][symbol]["types"]["payload"]["scalars"];

/**
 * A union of the field names of a model.
 *
 * @template M The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId" | "createdAt" | "updatedAt", where M = "article"
 */
type AllModelFieldName<M extends ModelKey> = Extract<
  keyof ModelScalarPayload<M>,
  string
>;

/**
 * A union of the field names of a model that are of type `T`.
 *
 * @template M The model name
 * @template T The type of the field
 *
 * @example "title" | "content" | "fi", where M = "article" and T = string
 */
type ModelFieldNameByType<M extends ModelKey, T> = {
  [F in AllModelFieldName<M>]: ModelScalarPayload<M>[F] extends T ? F : never;
}[AllModelFieldName<M>];

/**
 * A union of the field names of a model that are serializable.
 *
 * @template M The model name
 *
 * @example "id" | "title" | "content" | "fi" | "userId", where M = "article"
 */
type SerializableModelFieldName<M extends ModelKey> = ModelFieldNameByType<
  M,
  boolean | bigint | number | string
>;

/**
 * A union of the field names of a model that are of type `string`.
 *
 * @template M The model name
 *
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
 * @template M The model name
 */
type QueryArgs<M extends ModelKey> = Prisma.Args<PrismaClient[M], "findMany">;

/**
 * `Fraci` with the some additional methods for Prisma.
 */
type FraciForPrisma<
  D extends string,
  L extends string,
  M extends ModelKey,
  W,
  X
> = Fraci<D, L, X> & {
  /**
   * Checks if the error is a conflict error for the fractional index.
   *
   * @param error The error to check.
   * @returns `true` if the error is a conflict error for the fractional index, or `false` otherwise.
   */
  isIndexConflictError(error: unknown): error is PrismaClientConflictError;
  /**
   * Retrieves the existing indices to generate a new fractional index for the item after the specified item.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param cursor The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the first item.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item after the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  indicesForAfter: {
    (
      where: W & QueryArgs<M>["where"],
      cursor: QueryArgs<M>["cursor"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X> | undefined>;
    (
      where: W & QueryArgs<M>["where"],
      cursor: null,
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X>>;
  };
  /**
   * Retrieves the existing indices to generate a new fractional index for the item before the specified item.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param cursor The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the last item.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item before the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  indicesForBefore: {
    (
      where: W & QueryArgs<M>["where"],
      cursor: QueryArgs<M>["cursor"],
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X> | undefined>;
    (
      where: W & QueryArgs<M>["where"],
      cursor: null,
      client?: AnyPrismaClient
    ): Promise<Indices<D, L, X>>;
  };
  /**
   * Retrieves the existing indices to generate a new fractional index for the first item.
   * Equivalent to `indicesForAfter(where, null, client)`.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the first item.
   */
  indicesForFirst(
    where: W & QueryArgs<M>["where"],
    client?: AnyPrismaClient
  ): Promise<Indices<D, L, X>>;
  /**
   * Retrieves the existing indices to generate a new fractional index for the last item.
   * Equivalent to `indicesForBefore(where, null, client)`.
   *
   * @param where The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the last item.
   */
  indicesForLast(
    where: W & QueryArgs<M>["where"],
    client?: AnyPrismaClient
  ): Promise<Indices<D, L, X>>;
};

/**
 * The options for the fractional index fields.
 *
 * @template T The type of the name of the group fields
 *
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

// Type definitions below are for the Prisma extension.
// Although it's easier to define the types without generics of `FractionalIndexingExtensionOptions` inside the function, we define them here to keep the function signature concise.

/**
 * A union of the pairs of the key and value of the `fields` property of the options.
 *
 * @template O The options type
 *
 * @example ["article.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ["photo.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ...
 */
type FieldsUnion<O extends PrismaFraciOptions> = {
  [K in keyof O["fields"]]: [K, O["fields"][K]];
}[keyof O["fields"]];

/**
 * The field information for the Prisma extension.
 *
 * @template I The field options type
 * @template M The model name
 * @template W The type of the required fields for the `where` argument of the `findMany` method
 * @template X The brand type for the fractional index
 */
type FieldInfo<I extends FieldOptions, M extends ModelKey, W, X> = {
  readonly I: I;
  readonly value: FractionalIndex<I["digitBase"], I["lengthBase"], X>;
  readonly helper: FraciForPrisma<I["digitBase"], I["lengthBase"], M, W, X>;
};

/**
 * The field information for each model.
 *
 * @template O The options type
 */
type PerModelFieldInfo<O extends PrismaFraciOptions> = {
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
type ExtensionModel<O extends PrismaFraciOptions> = {
  [M in keyof PerModelFieldInfo<O>]: {
    fraci<F extends keyof PerModelFieldInfo<O>[M]>(
      field: F
    ): PerModelFieldInfo<O>[M][F]["helper"];
  };
};

/**
 * The type of our Prisma extension.
 *
 * @template O The options type
 */
type Extension<O extends PrismaFraciOptions> = {
  name: typeof EXTENSION_NAME;
  model: ExtensionModel<O>;
};

/**
 * Checks if the error is a conflict error for the fractional index.
 *
 * This is important for handling unique constraint violations when inserting items
 * with the same fractional index, which can happen in concurrent environments.
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
    (error as PrismaClientKnownRequestError).code === PRISMA_CONFLICT_CODE && // P2002 is the Prisma code for unique constraint violations
    (error as any).meta?.modelName === modelName && // Check if the error is for the correct model
    Array.isArray((error as any).meta?.target) && // Check if the target field is specified
    (error as any).meta.target.includes(field) // Check if the target includes our fractional index field
  );
}

/**
 * Creates a Prisma extension for fractional indexing.
 *
 * @param param0 The options for the fractional indexing extension.
 * @returns The Prisma extension.
 */
export function prismaFraci<Options extends PrismaFraciOptions>({
  fields,
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: Options) {
  return Prisma.defineExtension((client) => {
    // Create a shared cache for better performance across multiple fields
    const cache = createFraciCache();

    type HelperValue = FraciForPrisma<any, any, any, any, any>;

    // Map to store helper instances for each model.field combination
    const helperMap = new Map<string, HelperValue>();

    // Process each field configuration from the options
    for (const [modelAndField, { lengthBase, digitBase }] of Object.entries(
      fields
    ) as [string, FieldOptions][]) {
      // Split the "model.field" string into separate parts
      const [model, field] = modelAndField.split(".", 2) as [ModelKey, string];

      // Get the actual model name from Prisma metadata
      const { modelName } = (client as any)[model]?.fields?.[field] ?? {};
      if (!modelName) {
        throw new Error(
          `Could not get field information for ${model}.${field}`
        );
      }

      // Create the base fractional indexing helper
      const helper = fraci(
        {
          digitBase,
          lengthBase,
          maxLength,
          maxRetries,
        },
        cache // Share the cache for better performance
      );

      // Function to find indices for inserting an item after a specified cursor
      const indicesForAfter = async (
        where: any,
        cursor: any,
        pClient: AnyPrismaClient = client
      ): Promise<any> => {
        // Case 1: No cursor provided - get the first item in the group
        if (!cursor) {
          const firstItem = await pClient[model].findFirst({
            where, // Filter by group conditions
            select: { [field]: true }, // Only select the fractional index field
            orderBy: { [field]: "asc" }, // Order by the fractional index ascending
          });

          // We should always return a tuple of two indices if `cursor` is `null`.
          return [null, firstItem?.[field] ?? null];
        }

        // Case 2: Cursor provided - find items adjacent to the cursor
        const items = await pClient[model].findMany({
          cursor, // Start from the cursor position
          where, // Filter by group conditions
          select: { [field]: true }, // Only select the fractional index field
          orderBy: { [field]: "asc" }, // Order by the fractional index ascending
          take: 2, // Get the cursor item and the next item
        });

        // Return undefined if cursor not found, otherwise return the indices
        return items.length < 1
          ? undefined
          : [items[0][field], items[1]?.[field] ?? null];
      };

      // Function to find indices for inserting an item before a specified cursor
      const indicesForBefore = async (
        where: any,
        cursor: any,
        pClient: AnyPrismaClient = client
      ): Promise<any> => {
        // Case 1: No cursor provided - get the last item in the group
        if (!cursor) {
          const lastItem = await pClient[model].findFirst({
            where, // Filter by group conditions
            select: { [field]: true }, // Only select the fractional index field
            orderBy: { [field]: "desc" }, // Order by the fractional index descending
          });

          // We should always return a tuple of two indices if `cursor` is `null`.
          return [lastItem?.[field] ?? null, null];
        }

        // Case 2: Cursor provided - find items adjacent to the cursor
        const items = await pClient[model].findMany({
          cursor, // Start from the cursor position
          where, // Filter by group conditions
          select: { [field]: true }, // Only select the fractional index field
          orderBy: { [field]: "desc" }, // Order by the fractional index descending
          take: 2, // Get the cursor item and the previous item
        });

        // Return undefined if cursor not found, otherwise return the indices in correct order
        return items.length < 1
          ? undefined
          : [items[1]?.[field] ?? null, items[0][field]];
      };

      // Create an enhanced helper with Prisma-specific methods
      const helperEx: HelperValue = {
        ...helper, // Include all methods from the base fraci helper
        isIndexConflictError: (
          error: unknown
        ): error is PrismaClientConflictError =>
          isIndexConflictError(error, modelName, field),
        indicesForAfter,
        indicesForBefore,
        indicesForFirst: (where: any, pClient?: AnyPrismaClient) =>
          indicesForAfter(where, null, pClient),
        indicesForLast: (where: any, pClient?: AnyPrismaClient) =>
          indicesForBefore(where, null, pClient),
      };

      // Store the helper in the map with a unique key combining model and field
      helperMap.set(`${model}\0${field}`, helperEx);
    }

    // Create the extension model object that will be attached to each Prisma model
    const extensionModel = Object.create(null) as Record<ModelKey, unknown>;

    // Iterate through all models in the Prisma client
    for (const model of Object.keys(client) as ModelKey[]) {
      // Skip internal Prisma properties that start with $ or _
      if (model.startsWith("$") || model.startsWith("_")) {
        continue;
      }

      // Add the fraci method to each model
      extensionModel[model] = {
        // This method retrieves the appropriate helper for the specified field
        fraci(field: string) {
          return helperMap.get(`${model}\0${field}`)!;
        },
      };
    }

    // Register the extension with Prisma
    return client.$extends({
      name: EXTENSION_NAME,
      model: extensionModel,
    } as unknown as Extension<Options>);
  });
}
