import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  BASE62,
  fraciString,
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

// ----------------------
// Our schema starts here
// ----------------------

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
};

// exampleItem table
export const exampleItems = sqliteTable(
  "exampleItem",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    fi: fi("fi", () => fraciForExampleItem), // Fractional Index
    groupId: integer("group_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("group_id_fi_idx").on(table.groupId, table.fi)],
);

const fraciForExampleItem = fraciString({
  brand: "drizzle.exampleItem.fi",
  lengthBase: BASE62,
  digitBase: BASE62,
});

export const fiExampleItems = defineDrizzleFraci(
  fraciForExampleItem,
  exampleItems,
  exampleItems.fi,
  { groupId: exampleItems.groupId },
  { id: exampleItems.id },
);
