// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `createFractionalIndexingExtension` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma, PrismaClient } from "@prisma/client/extension.js";
import {
  createFractionalIndexing,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  type FractionalIndexing,
} from "./factory.js";
import type { FractionalIndex } from "./lib/types.js";

const EXTENSION_NAME = "fractionalIndexing";

declare const PRISMA_BRAND: unique symbol;

/**
 * A brand for Prisma models and fields.
 *
 * @template M The model name.
 * @template F The field name.
 */
type PrismaBrand<M extends string, F extends string> = {
  [PRISMA_BRAND]: { model: M; field: F };
};

type WithDefault<T, E, F> = Extract<T, E> extends never ? F : Extract<T, E>;

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
  getIndicesBefore: {
    (
      cursor: Prisma.Args<PrismaClient[M], "findMany">["cursor"],
      where: W & Prisma.Args<PrismaClient[M], "findMany">["where"]
    ): Promise<
      | [a: FractionalIndex<D, L, X> | null, b: FractionalIndex<D, L, X> | null]
      | undefined
    >;
    (
      cursor: null,
      where: W & Prisma.Args<PrismaClient[M], "findMany">["where"]
    ): Promise<
      [a: FractionalIndex<D, L, X> | null, b: FractionalIndex<D, L, X> | null]
    >;
  };
  getIndicesAfter: {
    (
      cursor: Prisma.Args<PrismaClient[M], "findMany">["cursor"],
      where: W & Prisma.Args<PrismaClient[M], "findMany">["where"]
    ): Promise<
      | [a: FractionalIndex<D, L, X> | null, b: FractionalIndex<D, L, X> | null]
      | undefined
    >;
    (
      cursor: null,
      where: W & Prisma.Args<PrismaClient[M], "findMany">["where"]
    ): Promise<
      [a: FractionalIndex<D, L, X> | null, b: FractionalIndex<D, L, X> | null]
    >;
  };
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

export interface FractionalIndexingExtensionOptions {
  /**
   * The prefix for the fractional index fields.
   *
   * @default "__fi_"
   */
  readonly prefix?: string;

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

type FieldsUnion<O extends FractionalIndexingExtensionOptions> = {
  [K in keyof O["fields"]]: [K, O["fields"][K]];
}[keyof O["fields"]];

type Prefix<O extends FractionalIndexingExtensionOptions> = WithDefault<
  O["prefix"],
  string,
  "__fi_"
>;

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
 * [result component](https://www.prisma.io/docs/orm/prisma-client/client-extensions/result) of the Prisma extension.
 */
type ExtensionResult<O extends FractionalIndexingExtensionOptions> = {
  [M in keyof PerModelFieldInfo<O>]: {
    [F in Extract<
      keyof PerModelFieldInfo<O>[M],
      string
    > as `${Prefix<O>}${F}`]: {
      needs: { [K in F]: true };
      compute: (args: {
        [K in F]: string;
      }) => PerModelFieldInfo<O>[M][F]["value"];
    };
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

type Extension<O extends FractionalIndexingExtensionOptions> = {
  name: typeof EXTENSION_NAME;
  model: ExtensionModel<O>;
  result: ExtensionResult<O>;
};

export function createFractionalIndexingExtension<
  Options extends FractionalIndexingExtensionOptions
>({
  fields,
  prefix = "__fi_",
  maxLength = DEFAULT_MAX_LENGTH,
  maxRetries = DEFAULT_MAX_RETRIES,
}: Options) {
  return Prisma.defineExtension((client) => {
    type HelperValue = FractionalIndexingForPrisma<any, any, any, any, any>;

    const helperMap = new Map<string, HelperValue>();
    const extensionResult = Object.create(null) as Record<
      ModelKey,
      Record<string, { needs: {}; compute: (args: any) => any }>
    >;
    for (const [modelAndField, { lengthBase, digitBase }] of Object.entries(
      fields
    ) as [string, FieldOptions][]) {
      const [model, field] = modelAndField.split(".", 2) as [ModelKey, string];
      const helper = createFractionalIndexing({
        digitBase,
        lengthBase,
        maxLength,
        maxRetries,
      });

      extensionResult[model] ??= Object.create(null);
      extensionResult[model][`${prefix}${field}`] = {
        needs: { [field]: true },
        compute({ [field]: value }) {
          return value;
        },
      };

      const helperEx: HelperValue = {
        ...helper,
        getIndicesAfter: async (cursor: any, where: any): Promise<any> => {
          if (!cursor) {
            const firstItem = await (client as any)[model].findFirst({
              where,
              select: { [field]: true },
              orderBy: { [field]: "asc" },
            });
            // We should always return a tuple of two indices if `cursor` is `null`.
            return [null, firstItem?.[field] ?? null];
          }

          const items = await (client as any)[model].findMany({
            cursor,
            where,
            select: { [field]: true },
            orderBy: { [field]: "asc" },
            take: 2,
          });
          return items.length < 1
            ? undefined
            : [items[0][field], items[1]?.[field] ?? null];
        },
        getIndicesBefore: async (cursor: any, where: any): Promise<any> => {
          if (!cursor) {
            const lastItem = await (client as any)[model].findFirst({
              where,
              select: { [field]: true },
              orderBy: { [field]: "desc" },
            });
            // We should always return a tuple of two indices if `cursor` is `null`.
            return [lastItem?.[field] ?? null, null];
          }

          const items = await (client as any)[model].findMany({
            cursor,
            where,
            select: { [field]: true },
            orderBy: { [field]: "desc" },
            take: 2,
          });
          return items.length < 1
            ? undefined
            : [items[1]?.[field] ?? null, items[0][field]];
        },
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
      result: extensionResult,
    } as unknown as Extension<Options>);
  });
}
