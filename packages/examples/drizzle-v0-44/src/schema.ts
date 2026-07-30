import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  BASE26L,
  BASE36L,
  fraci,
  type AnyStringFraci,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

function fi<const Name extends string, const F extends AnyStringFraci>(
  name: Name,
  _fraci: () => F,
) {
  return text(name).notNull().$type<FractionalIndexOf<F>>();
}

const itemFraci = fraci({
  brand: "drizzle.test_item.fi",
  lengthBase: BASE26L,
  digitBase: BASE36L,
});

export const testItems = sqliteTable("test_item", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  fi: fi("fi", () => itemFraci),
  groupId: integer("group_id").notNull(),
});

export const fiTestItems = defineDrizzleFraci(
  itemFraci,
  testItems,
  testItems.fi,
  { groupId: testItems.groupId },
  { id: testItems.id },
);
