import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  BASE26L,
  BASE36L,
  fraci,
  type AnyStringFraci,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Utility function to define a fractional index column. Should be copied to your project.
function fi<const Name extends string, const Fraci extends AnyStringFraci>(
  name: Name,
  _fi: () => Fraci,
) {
  return text(name).notNull().$type<FractionalIndexOf<Fraci>>();
}

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
};

// Test table - works with all Drizzle versions
export const testItems = sqliteTable(
  "test_item",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    fi: fi("fi", () => fraciForTestItems),
    groupId: integer("group_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("group_id_fi_idx").on(table.groupId, table.fi)],
);

const fraciForTestItems = fraci({
  brand: "drizzle.test_item.fi",
  lengthBase: BASE26L,
  digitBase: BASE36L,
});

export const fiTestItems = defineDrizzleFraci(
  fraciForTestItems,
  testItems,
  testItems.fi,
  { groupId: testItems.groupId },
  { id: testItems.id },
);
