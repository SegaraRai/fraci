/**
 * The Prisma conflict error code.
 */
const PRISMA_CONFLICT_CODE = "P2002";

/**
 * {@link PrismaClientKnownRequestError} of the conflict error.
 */
export type PrismaClientConflictError = {
  name: "PrismaClientKnownRequestError";
  code: typeof PRISMA_CONFLICT_CODE;
  meta: {
    modelName?: string;
    target?: string[];
    driverAdapterError?: {
      cause?: {
        constraint?: {
          fields?: string[];
        };
      };
    };
  };
};

/**
 * Checks if the error is a conflict error for the fractional index.
 *
 * This is important for handling unique constraint violations when inserting items
 * with the same fractional index, which can happen in concurrent environments.
 *
 * @param error - The error object to check.
 * @param modelName - The model name.
 * @param field - The field name of the fractional index.
 * @returns `true` if the error is a conflict error for the fractional index, or `false` otherwise.
 */
export function isIndexConflictError(
  error: unknown,
  modelName: string,
  field: string,
): error is PrismaClientConflictError {
  const meta = (error as any)?.meta;
  const target =
    meta?.target ?? meta?.driverAdapterError?.cause?.constraint?.fields;

  return (
    error instanceof Error &&
    error.name === "PrismaClientKnownRequestError" &&
    (error as any).code === PRISMA_CONFLICT_CODE && // P2002 is the Prisma code for unique constraint violations
    // Prisma 5.0 does not include modelName in P2002 metadata.
    (meta?.modelName === undefined || meta.modelName === modelName) &&
    Array.isArray(target) && // Check if the target field is specified
    target.includes(field) // Check if the target includes our fractional index field
  );
}
