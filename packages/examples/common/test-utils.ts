// Shared test utilities
import { webcrypto as crypto } from "node:crypto";

export function createTempDbName(): string {
  return `test-${crypto.randomUUID()}.db`;
}

export function createMemoryDbUrl(): string {
  return ":memory:";
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withCleanup<T>(
  setup: () => Promise<T>,
  test: (resource: T) => Promise<void>,
  cleanup: (resource: T) => Promise<void>,
): Promise<void> {
  const resource = await setup();
  try {
    await test(resource);
  } finally {
    await cleanup(resource);
  }
}
