import { expect, test } from "bun:test";
import { asc, sql } from "drizzle-orm";
import { exampleItems } from "../../drizzle/schema.e2e-binary.js";
import { setupDrizzleDBLibSQL } from "../../test/drizzle.e2e-binary.js";

const binFI = (values: readonly number[]) => new Uint8Array(values) as any;

const bin = (values: readonly number[]) => new Uint8Array(values);

test("Binary comparison and sorting", async () => {
  const db = await setupDrizzleDBLibSQL();

  await db.insert(exampleItems).values([
    { groupId: 1, name: "A", fi: binFI([0, 0, 0]) },
    { groupId: 1, name: "B", fi: binFI([128]) },
    { groupId: 1, name: "C", fi: binFI([128, 0]) },
    { groupId: 1, name: "D", fi: binFI([128, 0, 0]) },
    { groupId: 1, name: "E", fi: binFI([128, 0, 1]) },
    { groupId: 1, name: "F", fi: binFI([128, 0, 255]) },
    { groupId: 1, name: "G", fi: binFI([128, 1]) },
    { groupId: 1, name: "H", fi: binFI([128, 255]) },
    { groupId: 1, name: "I", fi: binFI([129]) },
    { groupId: 1, name: "J", fi: binFI([129, 127]) },
    { groupId: 1, name: "L", fi: binFI([255]) },
    { groupId: 1, name: "K", fi: binFI([200]) },
  ]);

  expect(
    (
      await db
        .select({ name: exampleItems.name })
        .from(exampleItems)
        .orderBy(asc(exampleItems.fi))
        .all()
    )
      .map((r) => r.name)
      .join("")
  ).toBe("ABCDEFGHIJKL");

  for (const truthy of [
    sql`SELECT ${bin([128, 0, 0])} = ${bin([128, 0, 0])};`,
    sql`SELECT ${bin([128, 0])} != ${bin([128, 0, 0])};`,
    sql`SELECT ${bin([128, 0])} < ${bin([128, 0, 0])};`,
    sql`SELECT ${bin([128, 0])} < ${bin([128, 0, 1])};`,
    sql`SELECT ${bin([128, 1])} > ${bin([128, 0, 1])};`,
    sql`SELECT ${bin([128, 0, 0])} > ${bin([128, 0])};`,
    sql`SELECT ${bin([128, 0, 1])} < ${bin([128, 1])};`,
  ]) {
    expect((await db.run(truthy)).rows[0][0]).toBe(1);
  }
});
