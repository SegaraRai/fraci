import {
  createHmac,
  type BinaryLike,
  type BinaryToTextEncoding,
  type KeyObject,
} from "node:crypto";
// Import `@prisma/client/extension.js` instead of `@prisma/client` to prevent types in `PrismaClient` from being extracted in the return type of the `createFractionalIndexingExtension` function.
// In `@prisma/client/extension.js`, `PrismaClient` is exported as `any`, which is not usable by users, so the import destination is modified to `@prisma/client` in post-processing.
import { Prisma, PrismaClient } from "@prisma/client/extension.js";
import {
  createFractionalIndexing,
  DEFAULT_MAX_LENGTH,
  DEFAULT_MAX_RETRIES,
  type FractionalIndexing,
} from "./factory.js";
import { IS_VALID } from "./lib/internal-symbols.js";
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
 * `FractionalIndexing` with the `parse` method which parses the fractional index.
 */
type FractionalIndexingWithParse<
  D extends string,
  L extends string,
  X,
  M
> = FractionalIndexing<D, L, X> & {
  parse: (
    index: string,
    signature: string,
    model: M
  ) => FractionalIndex<D, L, X> | undefined;
};

/**
 * The options for the fractional index fields. (without sign)
 *
 * @example { digitBase: "0123456789", lengthBase: "0123456789" }
 */
type FieldOptionsWithoutSign = {
  readonly digitBase: string;
  readonly lengthBase: string;

  // Prevent extraneous properties to help type inference.
  readonly group?: never;
};

/**
 * The options for the fractional index fields. (with sign)
 *
 * @template T The type of the name of the group fields.
 * @example { group: ["userId", "title"], digitBase: "0123456789", lengthBase: "0123456789" }, where T = "userId" | "title"
 */
type FieldOptionsWithSign<T extends string> = {
  readonly group: readonly T[];
  readonly digitBase: string;
  readonly lengthBase: string;
};

type FieldOptions<O extends FractionalIndexingExtensionOptions> =
  O extends FractionalIndexingExtensionOptionsWithSign
    ? FieldOptionsWithSign<string>
    : FieldOptionsWithoutSign;

/**
 * The record of the fractional index fields. (without sign)
 *
 * @example { "article.fi": { digitBase: "0123456789", lengthBase: "0123456789" } }
 */
type FieldOptionsRecordWithoutSign = {
  readonly [Q in QualifiedFields[0]]?: FieldOptionsWithoutSign;
};

/**
 * The record of the fractional index fields. (with sign)
 *
 * @example { "article.fi": { group: ["userId"], digitBase: "0123456789", lengthBase: "0123456789" } }
 */
type FieldOptionsRecordWithSign = {
  readonly [Q in QualifiedFields[0]]?: FieldOptionsWithSign<
    Extract<QualifiedFields, [Q, any]>[1]
  >;
};

interface FractionalIndexingExtensionOptionsBase {
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
}

interface FractionalIndexingExtensionOptionsWithoutSign
  extends FractionalIndexingExtensionOptionsBase {
  /**
   * The fractional index fields.
   */
  readonly fields: FieldOptionsRecordWithoutSign;

  // Prevent extraneous properties to help type inference.
  readonly sign?: never;
  readonly verify?: never;
}

interface FractionalIndexingExtensionOptionsWithSign
  extends FractionalIndexingExtensionOptionsBase {
  /**
   * The fractional index fields.
   */
  readonly fields: FieldOptionsRecordWithSign;

  /**
   * Signs the plaintext which includes the fractional index with some relevant information (e.g., model name, field name, etc.).
   * If this is not provided, the extension will not have the ability to sign or parse the fractional index.
   *
   * @default undefined
   */
  readonly sign:
    | ((value: string) => string)
    | {
        /**
         * HMAC secret.
         */
        secret: BinaryLike | KeyObject;
        /**
         * HMAC algorithm.
         *
         * @default "SHA256"
         */
        algorithm?: "SHA256" | "SHA512";
        /**
         * HMAC encoding.
         *
         * @default "hex"
         */
        encoding?: BinaryToTextEncoding;
      };

  /**
   * Verifies the signature.
   * A timing-safe comparison is used by default, so you don't need to provide this function if the `sign` returns a deterministic value.
   * If the `sign` function is not deterministic (e.g., JWT with timestamp), you have to provide this function to verify the signature.
   *
   * @param plaintext
   * @param signature
   * @param sign `sign` function
   * @returns `true` if the signature is valid; otherwise, `false`.
   *
   * @default
   * (plaintext, signature, sign) => timingSafeEqual(signature, sign(plaintext))
   */
  readonly verify?: (
    plaintext: string,
    signature: string,
    sign: (value: string) => string
  ) => boolean;
}

export type FractionalIndexingExtensionOptions =
  | FractionalIndexingExtensionOptionsWithoutSign
  | FractionalIndexingExtensionOptionsWithSign;

function timingSafeEqual(expected: string, actual: string) {
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ actual.charCodeAt(i % actual.length);
  }

  return result === 0;
}

function defaultVerify(
  plaintext: string,
  signature: string,
  sign: (value: string) => string
) {
  return timingSafeEqual(signature, sign(plaintext));
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

type FieldInfo<
  O extends FractionalIndexingExtensionOptions,
  I extends FieldOptions<O>,
  P,
  X
> = {
  readonly I: I;
  readonly value: FractionalIndex<I["digitBase"], I["lengthBase"], X>;
  readonly helper: O extends FractionalIndexingExtensionOptionsWithSign
    ? FractionalIndexingWithParse<I["digitBase"], I["lengthBase"], X, P>
    : FractionalIndexing<I["digitBase"], I["lengthBase"], X>;
};

type PerModelFieldInfo<O extends FractionalIndexingExtensionOptions> = {
  [M in ModelKey]: {
    [F in StringModelFieldName<M> as `${M}.${F}` extends FieldsUnion<O>[0]
      ? F
      : never]: FieldInfo<
      O,
      Extract<FieldsUnion<O>, [`${M}.${F}`, FieldOptions<O>]>[1],
      O extends FractionalIndexingExtensionOptionsWithSign
        ? Pick<
            ModelScalarPayload<M>,
            Extract<
              Extract<
                FieldsUnion<O>,
                [`${M}.${F}`, FieldOptions<O>]
              >[1]["group"][number],
              AllModelFieldName<M>
            >
          >
        : {},
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
  } & (O extends FractionalIndexingExtensionOptionsWithSign
    ? {
        [F in Extract<
          keyof PerModelFieldInfo<O>[M],
          string
        > as `${Prefix<O>}${F}_sign`]: {
          needs: { [K in F]: true };
          compute: (args: {
            [K in F]: string;
          }) => string;
        };
      }
    : {});
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
  ...options
}: Options) {
  const { sign, verify = defaultVerify } =
    options as Partial<FractionalIndexingExtensionOptionsWithSign>;

  const fnSign =
    !sign || typeof sign === "function"
      ? sign
      : (value: string): string => {
          // Although I personally prefer the Web Crypto API as it's more portable, I used Node.js's crypto module here since
          // - the Prisma extension is unlikely to support async functions, and
          // - it's easier to stringify the hash output with Node.js's crypto module.
          const hmac = createHmac(sign.algorithm ?? "SHA256", sign.secret);
          return hmac.update(value).digest(sign.encoding ?? "hex");
        };

  return Prisma.defineExtension((client) => {
    type HelperValue =
      Options extends FractionalIndexingExtensionOptionsWithSign
        ? FractionalIndexingWithParse<any, any, any, any>
        : FractionalIndexing<any, any, any>;

    const helperMap = new Map<string, HelperValue>();
    const extensionResult = Object.create(null) as Record<
      ModelKey,
      Record<string, { needs: {}; compute: (args: any) => any }>
    >;
    for (const [
      modelAndField,
      { lengthBase, digitBase, ...fieldOptions },
    ] of Object.entries(fields) as [string, FieldOptions<Options>][]) {
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

      let helperEx = helper as HelperValue;

      const { group } = fieldOptions as Partial<FieldOptionsWithSign<string>>;
      if (group && fnSign) {
        const sortedGroup = group.slice().sort();
        const toGroupKey = (payload: Record<string, string | number>) =>
          sortedGroup.map((key: string) => `${key}=${payload[key]}\0`).join("");
        const createPlaintext = (
          index: string,
          payload: Record<string, string | number>
        ) =>
          `M=${model}\0F=${field}\0D=${digitBase}\0L=${lengthBase}\0\0${toGroupKey(
            payload
          )}\0I=${index}`;

        helperEx = {
          ...helper,
          parse(
            index: string,
            signature: string,
            payload: Record<string, string | number>
          ) {
            return verify(createPlaintext(index, payload), signature, fnSign) &&
              helper[IS_VALID](index)
              ? index
              : undefined;
          },
        } as HelperValue;

        extensionResult[model][`${prefix}${field}_sign`] = {
          needs: Object.fromEntries(
            [field, ...sortedGroup].map((key) => [key, true])
          ),
          compute({ [field]: value, ...payload }) {
            return fnSign(createPlaintext(value, payload));
          },
        };
      }

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
