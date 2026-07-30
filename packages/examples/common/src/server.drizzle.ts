import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

// Generic server utilities that work with all Drizzle versions
export class DrizzleTestServer {
  private client: any;
  private db: any;

  constructor(url: string = ":memory:") {
    this.client = createClient({ url });
    this.db = drizzle(this.client);
  }

  async setupDatabase() {
    // Create test table structure
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS test_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        fi TEXT NOT NULL,
        group_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at INTEGER NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);

    await this.db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS group_id_fi_idx ON test_item(group_id, fi)
    `);
  }

  getDatabase() {
    return this.db;
  }

  async close() {
    await this.client.close();
  }

  async cleanup() {
    await this.db.run(`DROP TABLE IF EXISTS test_item`);
  }
}

// Common test operations
export async function insertTestItems(
  fiTestItems: any,
  db: any,
  groupId: number,
  count: number = 2,
) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const item = await fiTestItems.insert(db, {
      name: `Test Item ${i + 1}`,
      groupId,
    });
    items.push(item);
  }
  return items;
}

export async function getOrderedItems(
  testItems: any,
  db: any,
  groupId: number,
) {
  return await db
    .select()
    .from(testItems)
    .where(eq(testItems.groupId, groupId))
    .orderBy(testItems.fi);
}
