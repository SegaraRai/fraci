// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `prismaFraci` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma } from "@prisma/client/extension.js";
import {
  createFraciCache,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  fraciBinary,
  fraciString,
  type AnyFraci,
  type Fraci,
} from "../factory.js";
import { FraciError } from "../lib/errors.js";
import type { AnyFractionalIndex, FractionalIndex } from "../lib/types.js";
import type { FraciOf } from "../types.js";
import {
  isIndexConflictError,
  type PrismaClientConflictError,
} from "./common.js";
import { EXTENSION_NAME } from "./constants.js";
import type {
  AllModelFieldName,
  AnyPrismaClient,
  BinaryModelFieldName,
  ModelKey,
  ModelScalarPayload,
  QueryArgs,
  StringModelFieldName,
} from "./prisma-types.js";
import type { PrismaFraciFieldOptions, PrismaFraciOptions } from "./schema.js";

/**
 * A brand for Prisma models and fields.
 *
 * @template Model - The model name
 * @template Field - The field name
 */
type PrismaBrand<Model extends string, Field extends string> = {
  readonly __prisma__: { model: Model; field: Field };
};

/**
 * A tuple of two fractional indices, used for generating a new index between them.
 *
 * @template FI - The fractional index type
 */
type Indices<FI extends AnyFractionalIndex> = [a: FI | null, b: FI | null];

/**
 * Type representing the enhanced fractional indexing utility for Prisma ORM.
 * This type extends the base fractional indexing utility with additional methods for retrieving indices.
 *
 * This is an internal type used to define the methods for the Prisma extension.
 *
 * @template Model - The model name
 * @template Where - The type of the required fields for the `where` argument of the `findMany` method
 * @template FI - The fractional index type
 *
 * @see {@link Fraci} - The base fractional indexing utility type
 */
type FraciForPrismaInternal<
  Model extends ModelKey,
  Where,
  FI extends AnyFractionalIndex,
> = FraciOf<FI> & {
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
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the {@link PrismaFraciFieldOptions.group group} property of the field options.
   * @param cursor - The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the first item.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item after the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  indicesForAfter: {
    (
      where: Where & QueryArgs<Model>["where"],
      cursor: QueryArgs<Model>["cursor"],
      client?: AnyPrismaClient,
    ): Promise<Indices<FI> | undefined>;
    (
      where: Where & QueryArgs<Model>["where"],
      cursor: null,
      client?: AnyPrismaClient,
    ): Promise<Indices<FI>>;
  };
  /**
   * Retrieves the existing indices to generate a new fractional index for the item before the specified item.
   *
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the {@link PrismaFraciFieldOptions.group group} property of the field options.
   * @param cursor - The cursor (selector) of the item. If `null`, this method returns the indices to generate a new fractional index for the last item.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the item before the specified item, or `undefined` if the item specified by the `cursor` does not exist.
   */
  indicesForBefore: {
    (
      where: Where & QueryArgs<Model>["where"],
      cursor: QueryArgs<Model>["cursor"],
      client?: AnyPrismaClient,
    ): Promise<Indices<FI> | undefined>;
    (
      where: Where & QueryArgs<Model>["where"],
      cursor: null,
      client?: AnyPrismaClient,
    ): Promise<Indices<FI>>;
  };
  /**
   * Retrieves the existing indices to generate a new fractional index for the first item.
   * Equivalent to {@link FraciForPrismaInternal.indicesForAfter `indicesForAfter(where, null, client)`}.
   *
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the {@link PrismaFraciOptions.group group} property of the field options.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the first item.
   */
  indicesForFirst(
    where: Where & QueryArgs<Model>["where"],
    client?: AnyPrismaClient,
  ): Promise<Indices<FI>>;
  /**
   * Retrieves the existing indices to generate a new fractional index for the last item.
   * Equivalent to {@link FraciForPrismaInternal.indicesForBefore `indicesForBefore(where, null, client)`}.
   *
   * @param where - The `where` argument of the `findMany` method. Must have the fields specified in the {@link PrismaFraciOptions.group group} property of the field options.
   * @param client - The Prisma client to use. Should be specified when using transactions. If not specified, the client used to create the extension is used.
   * @returns The indices to generate a new fractional index for the last item.
   */
  indicesForLast(
    where: Where & QueryArgs<Model>["where"],
    client?: AnyPrismaClient,
  ): Promise<Indices<FI>>;
};

/**
 * Type representing the enhanced fractional indexing utility for Prisma ORM.
 * This type extends the base fractional indexing utility with additional methods for retrieving indices.
 *
 * @template Options - The field options type
 * @template Model - The model name
 * @template Field - The field name
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 */
type FraciForPrismaByFieldOptions<
  Options extends PrismaFraciFieldOptions,
  Model extends ModelKey,
  Field extends BinaryModelFieldName<Model> | StringModelFieldName<Model>,
> = FraciForPrismaInternal<
  Model,
  Pick<
    ModelScalarPayload<Model>,
    Extract<Options["group"][number], AllModelFieldName<Model>>
  >,
  Field extends BinaryModelFieldName<Model>
    ? Options extends { readonly type: "binary" }
      ? FractionalIndex<Options, PrismaBrand<Model, Field>>
      : never
    : Options extends {
          readonly lengthBase: string;
          readonly digitBase: string;
        }
      ? FractionalIndex<
          {
            readonly type: "string";
            readonly lengthBase: Options["lengthBase"];
            readonly digitBase: Options["digitBase"];
          },
          PrismaBrand<Model, Field>
        >
      : never
>;

/**
 * Type representing the enhanced fractional indexing utility for Prisma ORM.
 * This type extends the base fractional indexing utility with additional methods for retrieving indices.
 *
 * @template Options - The options type
 * @template QualifiedField - The qualified field name
 *
 * @see {@link Fraci} - The main fractional indexing utility type
 */
export type FraciForPrisma<
  Options extends PrismaFraciOptions,
  QualifiedField extends keyof Options["fields"],
> = Options["fields"][QualifiedField] extends PrismaFraciFieldOptions
  ? QualifiedField extends `${infer M}.${infer F}`
    ? FraciForPrismaByFieldOptions<Options["fields"][QualifiedField], M, F>
    : never
  : never;

/**
 * A union of the pairs of the key and value of the {@link PrismaFraciOptions.fields fields} property of the options.
 *
 * @template Options - The options type
 *
 * @example ["article.fi", { group: ["userId"], lengthBase: "0123456789", digitBase: "0123456789" }] | ["photo.fi", { group: ["userId"], lengthBase: "0123456789", digitBase: "0123456789" }] | ...
 */
type FieldsUnion<Options extends PrismaFraciOptions> = {
  [K in keyof Options["fields"]]: [K, Options["fields"][K]];
}[keyof Options["fields"]];

/**
 * The field information for each model.
 *
 * @template Options - The options type
 */
type PerModelFieldInfo<Options extends PrismaFraciOptions> = {
  [M in ModelKey]: {
    [F in
      | BinaryModelFieldName<M>
      | StringModelFieldName<M> as `${M}.${F}` extends FieldsUnion<Options>[0]
      ? F
      : never]: {
      readonly helper: Options["fields"][`${M}.${F}`] extends PrismaFraciFieldOptions
        ? FraciForPrismaByFieldOptions<Options["fields"][`${M}.${F}`], M, F>
        : never;
    };
  };
};

/**
 * [model component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/model) of the Prisma extension.
 *
 * @template Options - The options type
 */
type PrismaFraciExtensionModel<Options extends PrismaFraciOptions> = {
  [M in keyof PerModelFieldInfo<Options>]: {
    fraci<F extends keyof PerModelFieldInfo<Options>[M]>(
      field: F,
    ): PerModelFieldInfo<Options>[M][F]["helper"];
  };
};

/**
 * The type of our Prisma extension.
 *
 * @template Options - The options type
 */
export type PrismaFraciExtension<Options extends PrismaFraciOptions> = {
  name: typeof EXTENSION_NAME;
  model: PrismaFraciExtensionModel<Options>;
};

/**
 * {@link AnyFraci} for Prisma.
 */
type AnyFraciForPrisma = FraciForPrismaInternal<
  string,
  any,
  AnyFractionalIndex
>;

/**
 * Creates a Prisma extension for fractional indexing.
 *
 * @template Options - The options type
 *
 * @param options - The options for the fractional indexing extension
 * @returns The Prisma extension.
 * @throws {FraciError} Throws a {@link FraciError} when field information for a specified model.field cannot be retrieved
 * @throws {FraciError} Throws a {@link FraciError} when the digit or length base strings are invalid
 *
 * @see {@link FraciForPrisma} - The enhanced fractional indexing utility for Prisma ORM
 * @see {@link FraciError} - The custom error class for the Fraci library
 */
export function prismaFraci<const Options extends PrismaFraciOptions>({
  fields,
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: Options) {
  return Prisma.defineExtension((client) => {
    // Create a shared cache for better performance across multiple fields
    const cache = createFraciCache();

    // Map to store helper instances for each model.field combination
    const helperMap = new Map<string, AnyFraciForPrisma>();

    // Process each field configuration from the options
    for (const [modelAndField, config] of Object.entries(fields) as [
      string,
      PrismaFraciFieldOptions,
    ][]) {
      // Split the "model.field" string into separate parts
      const [model, field] = modelAndField.split(".", 2) as [ModelKey, string];

      // Get the actual model name from Prisma metadata
      const { modelName } = (client as any)[model]?.fields?.[field] ?? {};
      if (!modelName) {
        if (globalThis.__DEV__) {
          console.error(`FraciError: [INITIALIZATION_FAILED] Could not get field information for ${model}.${field}.
Make sure that
- The model and field names are correct and exist in the Prisma schema
- The Prisma client is generated with the correct schema
- The Prisma version is compatible with the extension`);
        }

        throw new FraciError(
          "INITIALIZATION_FAILED",
          `Could not get field information for ${model}.${field}`,
        );
      }

      // Create the base fractional indexing helper
      const helper =
        config.type === "binary"
          ? fraciBinary({
              maxLength,
              maxRetries,
            })
          : fraciString(
              {
                ...config,
                maxLength,
                maxRetries,
              },
              cache,
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
        pClient: AnyPrismaClient = client,
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
        pClient?: AnyPrismaClient,
      ): Promise<any> =>
        indicesFor(where, cursor, "asc", (a, b) => [a, b], pClient);

      // Function to find indices for inserting an item before a specified cursor
      const indicesForBefore = (
        where: any,
        cursor: any,
        pClient?: AnyPrismaClient,
      ): Promise<any> =>
        indicesFor(where, cursor, "desc", (a, b) => [b, a], pClient);

      // Create an enhanced helper with Prisma-specific methods
      const helperEx: AnyFraciForPrisma = {
        ...(helper as AnyFraci), // Include all methods from the base fraci helper
        isIndexConflictError: (
          error: unknown,
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
