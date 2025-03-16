// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `prismaFraci` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma } from "@prisma/client/extension.js";
import {
  createFraciCache,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  fraci,
  type Fraci,
} from "../factory.js";
import type { FractionalIndex } from "../lib/types.js";
import {
  isIndexConflictError,
  type PrismaClientConflictError,
} from "./common.js";
import { EXTENSION_NAME } from "./config.js";
import type {
  AllModelFieldName,
  AnyPrismaClient,
  Indices,
  ModelKey,
  ModelScalarPayload,
  QueryArgs,
  StringModelFieldName,
} from "./prisma-types.js";
import type { FieldOptions, PrismaFraciOptions } from "./schema.js";

/**
 * A brand for Prisma models and fields.
 *
 * @template M - The model name
 * @template F - The field name
 */
type PrismaBrand<M extends string, F extends string> = {
  readonly __prisma__: { model: M; field: F };
};

/**
 * `Fraci` with some additional methods for Prisma.
 *
 * @template D - The type of the digit base characters
 * @template L - The type of the length base characters
 * @template M - The model name
 * @template W - The type of the required fields for the `where` argument of the `findMany` method
 * @template X - The brand type for the fractional index
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
   * @param error - The error to check.
   * @returns `true` if the error is a conflict error for the fractional index, or `false` otherwise.
   */
  isIndexConflictError(error: unknown): error is PrismaClientConflictError;
  /**
   * Retrieves the existing indices to generate a new fractional index for the item after the specified item.
   *
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param cursor - The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the first item.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
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
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param cursor - The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the last item.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
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
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
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
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the `group` property of the field options.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the last item.
   */
  indicesForLast(
    where: W & QueryArgs<M>["where"],
    client?: AnyPrismaClient
  ): Promise<Indices<D, L, X>>;
};

type HelperValue = FraciForPrisma<any, any, any, any, any>;

/**
 * A union of the pairs of the key and value of the `fields` property of the options.
 *
 * @template O - The options type
 *
 * @example ["article.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ["photo.fi", { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" }] | ...
 */
type FieldsUnion<O extends PrismaFraciOptions> = {
  [K in keyof O["fields"]]: [K, O["fields"][K]];
}[keyof O["fields"]];

/**
 * The field information for the Prisma extension.
 *
 * @template I - The field options type
 * @template M - The model name
 * @template W - The type of the required fields for the `where` argument of the `findMany` method
 * @template X - The brand type for the fractional index
 */
type FieldInfo<I extends FieldOptions, M extends ModelKey, W, X> = {
  readonly I: I;
  readonly value: FractionalIndex<I["digitBase"], I["lengthBase"], X>;
  readonly helper: FraciForPrisma<I["digitBase"], I["lengthBase"], M, W, X>;
};

/**
 * The field information for each model.
 *
 * @template O - The options type
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
 *
 * @template O - The options type
 */
type PrismaFraciExtensionModel<O extends PrismaFraciOptions> = {
  [M in keyof PerModelFieldInfo<O>]: {
    fraci<F extends keyof PerModelFieldInfo<O>[M]>(
      field: F
    ): PerModelFieldInfo<O>[M][F]["helper"];
  };
};

/**
 * The type of our Prisma extension.
 *
 * @template O - The options type
 */
export type PrismaFraciExtension<O extends PrismaFraciOptions> = {
  name: typeof EXTENSION_NAME;
  model: PrismaFraciExtensionModel<O>;
};

/**
 * Creates a Prisma extension for fractional indexing.
 *
 * @template Options - The options type
 *
 * @param options - The options for the fractional indexing extension
 * @returns The Prisma extension.
 * @throws {Error} When field information for a specified model.field cannot be retrieved
 * @throws {Error} When the digit or length base strings are invalid
 */
export function prismaFraci<Options extends PrismaFraciOptions>({
  fields,
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: Options) {
  return Prisma.defineExtension((client) => {
    // Create a shared cache for better performance across multiple fields
    const cache = createFraciCache();

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
          `Fraci Prisma: Could not get field information for ${model}.${field}`
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

      /**
       * Internal function to retrieve indices for positioning items.
       * This function queries the database to find the appropriate indices
       * for inserting an item before or after a specified cursor position.
       *
       * @param where - The where clause to filter items by group
       * @param cursor - The cursor position, or null for first/last position
       * @param direction - The direction to search for indices (asc/desc)
       * @param tuple - A function to create a tuple from two indices
       * @param pClient - The Prisma client to use
       * @returns A tuple of indices, or undefined if the cursor doesn't exist
       */
      const indicesFor = async (
        where: any,
        cursor: any,
        direction: "asc" | "desc",
        tuple: <T>(a: T, b: T) => [T, T],
        pClient: AnyPrismaClient = client
      ): Promise<any> => {
        // Case 1: No cursor provided - get the first/last item in the group
        if (!cursor) {
          const item = await pClient[model].findFirst({
            where, // Filter by group conditions
            select: { [field]: true }, // Only select the fractional index field
            orderBy: { [field]: direction }, // Order by the fractional index in appropriate direction
          });

          // We should always return a tuple of two indices if `cursor` is `null`.
          // For after: [null, firstItem]
          // For before: [lastItem, null]
          return tuple(null, item?.[field] ?? null);
        }

        // Case 2: Cursor provided - find items adjacent to the cursor
        const items = await pClient[model].findMany({
          cursor, // Start from the cursor position
          where, // Filter by group conditions
          select: { [field]: true }, // Only select the fractional index field
          orderBy: { [field]: direction }, // Order by the fractional index in appropriate direction
          take: 2, // Get the cursor item and the adjacent item
        });

        return items.length < 1
          ? // Return undefined if cursor not found
            undefined
          : // Return the indices in the appropriate order based on direction
            tuple(items[0][field], items[1]?.[field] ?? null);
      };

      // Function to find indices for inserting an item after a specified cursor
      const indicesForAfter = (
        where: any,
        cursor: any,
        pClient?: AnyPrismaClient
      ): Promise<any> =>
        indicesFor(where, cursor, "asc", (a, b) => [a, b], pClient);

      // Function to find indices for inserting an item before a specified cursor
      const indicesForBefore = (
        where: any,
        cursor: any,
        pClient?: AnyPrismaClient
      ): Promise<any> =>
        indicesFor(where, cursor, "desc", (a, b) => [b, a], pClient);

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
    } as unknown as PrismaFraciExtension<Options>);
  });
}
