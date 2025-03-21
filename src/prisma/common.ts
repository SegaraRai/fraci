import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";

/**
 * The Prisma conflict error code.
 */
const PRISMA_CONFLICT_CODE = "P2002";

/**
 * {@link PrismaClientKnownRequestError} of the conflict error.
 */
export type PrismaClientConflictError = PrismaClientKnownRequestError & {
  code: typeof PRISMA_CONFLICT_CODE;
  meta: { modelName: string; target: string[] };
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
  return (
    error instanceof Error &&
    error.name === "PrismaClientKnownRequestError" &&
    (error as PrismaClientKnownRequestError).code === PRISMA_CONFLICT_CODE && // P2002 is the Prisma code for unique constraint violations
    (error as any).meta?.modelName === modelName && // Check if the error is for the correct model
    Array.isArray((error as any).meta?.target) && // Check if the target field is specified
    (error as any).meta.target.includes(field) // Check if the target includes our fractional index field
  );
}
