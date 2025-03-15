import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  BASE26L,
  BASE36L,
  BASE62,
  BASE95,
  fraci,
  type AnyFractionalIndex,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Utility function to define a fractional index column. Should be copied to your project.
function fi<FractionalIndex extends AnyFractionalIndex, Name extends string>(
  name: Name
) {
  return text(name).notNull().$type<FractionalIndex>();
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

// user table
export const users = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  ...timestamps,
});

// article table
export const articles = sqliteTable(
  "article",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    fi: fi<FractionalIndexOf<typeof fraciForArticles>, "fi">("fi"), // Fractional Index
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_id_fi_idx").on(table.userId, table.fi)]
);

// Here, we create a fraci instance for the articles table.
const fraciForArticles = fraci<
  typeof BASE36L, // Digit base
  typeof BASE26L, // Length base
  "drizzle.article.fi" // Branding string. Any string is fine.
>({
  digitBase: BASE36L,
  lengthBase: BASE26L,
});

export const fiArticles = defineDrizzleFraci(
  fraciForArticles, // Fraci instance
  articles, // Table
  articles.fi, // Fractional index column
  { userId: articles.userId }, // Group (columns that are used to find the group uniquely)
  { id: articles.id } // Cursor (columns that are used to find the row uniquely in the group)
);

// photo table
export const photos = sqliteTable(
  "photo",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    altText: text("alt_text").notNull(),
    fi: fi<FractionalIndexOf<typeof fraciForPhotos>, "fi">("fi"), // Fractional Index
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("article_id_fi_idx").on(table.articleId, table.fi),
    index("user_id_idx").on(table.userId),
  ]
);

const fraciForPhotos = fraci<
  typeof BASE36L,
  typeof BASE26L,
  "drizzle.photo.fi"
>({
  digitBase: BASE36L,
  lengthBase: BASE26L,
});

export const fiPhotos = defineDrizzleFraci(
  fraciForPhotos,
  photos,
  photos.fi,
  { articleId: photos.articleId },
  { id: photos.id }
);

// tag table
export const tags = sqliteTable(
  "tag",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [index("name_idx").on(table.name)]
);

// tagsOnPhotos table
export const tagsOnPhotos = sqliteTable(
  "tagsOnPhotos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    photoFI: fi<
      FractionalIndexOf<typeof fraciForPhotoFIInTagsOnPhotos>,
      "photo_fi"
    >("photo_fi"), // Fractional Index
    tagFI: fi<FractionalIndexOf<typeof fraciForTagFIInTagsOnPhotos>, "tag_fi">(
      "tag_fi"
    ), // Another Fractional Index
    photoId: integer("photo_id")
      .notNull()
      .references(() => photos.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tag_id_photo_fi_idx").on(table.tagId, table.photoFI),
    uniqueIndex("photo_id_tag_fi_idx").on(table.photoId, table.tagFI),
  ]
);

const fraciForPhotoFIInTagsOnPhotos = fraci<
  typeof BASE95,
  typeof BASE95,
  "drizzle.tagsOnPhotos.photo_fi"
>({
  digitBase: BASE95,
  lengthBase: BASE95,
});

const fraciForTagFIInTagsOnPhotos = fraci<
  typeof BASE95,
  typeof BASE95,
  "drizzle.tagsOnPhotos.tag_fi"
>({
  digitBase: BASE95,
  lengthBase: BASE95,
});

export const fiTagsInTagsOnPhotos = defineDrizzleFraci(
  fraciForTagFIInTagsOnPhotos,
  tagsOnPhotos,
  tagsOnPhotos.tagFI,
  { photoId: tagsOnPhotos.photoId },
  { tagId: tagsOnPhotos.tagId }
);

export const fiPhotosInTagsOnPhotos = defineDrizzleFraci(
  fraciForPhotoFIInTagsOnPhotos,
  tagsOnPhotos,
  tagsOnPhotos.photoFI,
  { tagId: tagsOnPhotos.tagId },
  { photoId: tagsOnPhotos.photoId }
);

// exampleItem table
export const exampleItems = sqliteTable(
  "exampleItem",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    fi: fi<FractionalIndexOf<typeof fraciForExampleItem>, "fi">("fi"), // Fractional Index
    groupId: integer("group_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("group_id_fi_idx").on(table.groupId, table.fi)]
);

const fraciForExampleItem = fraci<
  typeof BASE62,
  typeof BASE62,
  "drizzle.exampleItem.fi"
>({
  digitBase: BASE62,
  lengthBase: BASE62,
});

export const fiExampleItems = defineDrizzleFraci(
  fraciForExampleItem,
  exampleItems,
  exampleItems.fi,
  { groupId: exampleItems.groupId },
  { id: exampleItems.id }
);
