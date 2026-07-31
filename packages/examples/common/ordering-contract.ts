import { expect } from "vite-plus/test";

type Bounds<FI> = readonly [FI | null, FI | null];

export interface OrderingContractAdapter<FI> {
  generate(bounds: Bounds<FI>): FI;
  indicesForFirst(groupId: number): Promise<Bounds<FI>>;
  indicesForLast(groupId: number): Promise<Bounds<FI>>;
  indicesForAfter(
    groupId: number,
    cursorId: number,
  ): Promise<Bounds<FI> | undefined>;
  indicesForBefore(
    groupId: number,
    cursorId: number,
  ): Promise<Bounds<FI> | undefined>;
  insert(
    name: string,
    groupId: number,
    fractionalIndex: FI,
  ): Promise<{ id: number }>;
  names(groupId: number): Promise<string[]>;
  isConflictError?(error: unknown): boolean;
  verifyTransaction?(): Promise<void>;
}

export async function verifyOrderingContract<FI>(
  adapter: OrderingContractAdapter<FI>,
): Promise<void> {
  expect(await adapter.indicesForFirst(1)).toEqual([null, null]);
  expect(await adapter.indicesForLast(1)).toEqual([null, null]);
  expect(await adapter.indicesForAfter(1, 999_999)).toBeUndefined();
  expect(await adapter.indicesForBefore(1, 999_999)).toBeUndefined();

  const firstIndex = adapter.generate(await adapter.indicesForFirst(1));
  const first = await adapter.insert("First Item", 1, firstIndex);

  const lastBounds = await adapter.indicesForAfter(1, first.id);
  expect(lastBounds).toBeDefined();
  const lastIndex = adapter.generate(lastBounds!);
  const last = await adapter.insert("Last Item", 1, lastIndex);

  const beginningBounds = await adapter.indicesForBefore(1, first.id);
  expect(beginningBounds).toBeDefined();
  const beginningIndex = adapter.generate(beginningBounds!);
  await adapter.insert("Beginning Item", 1, beginningIndex);

  expect(await adapter.indicesForLast(1)).toEqual([lastIndex, null]);
  expect(await adapter.indicesForAfter(1, last.id)).toEqual([lastIndex, null]);
  expect(await adapter.names(1)).toEqual([
    "Beginning Item",
    "First Item",
    "Last Item",
  ]);

  const otherGroupIndex = adapter.generate(await adapter.indicesForFirst(2));
  await adapter.insert("Other Group", 2, otherGroupIndex);
  expect(await adapter.names(2)).toEqual(["Other Group"]);

  if (adapter.isConflictError) {
    let conflict: unknown;
    try {
      await adapter.insert("Duplicate", 1, firstIndex);
    } catch (error) {
      conflict = error;
    }
    expect(conflict).toBeDefined();
    expect(adapter.isConflictError(conflict)).toBe(true);
  }

  await adapter.verifyTransaction?.();
}
