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
  BASE95,
  fraci,
  type AnyStringFraci,
  type FractionalIndexOf,
} from "fraci";
import { defineDrizzleFraci } from "fraci/drizzle";

// Utility function to define a fractional index column. Should be copied to your project.
function fi<const Name extends string, const Fraci extends AnyStringFraci>(
  name: Name,
  _fi: () => Fraci
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
    fi: fi("fi", () => fraciForArticles), // Fractional Index
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_id_fi_idx").on(table.userId, table.fi)]
);

// Here, we create a fraci instance for the articles table.
const fraciForArticles = fraci({
  brand: "drizzle.article.fi", // Branding string. Any string is fine.
  lengthBase: BASE26L, // Length base
  digitBase: BASE36L, // Digit base
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
    fi: fi("fi", () => fraciForPhotos), // Fractional Index
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

const fraciForPhotos = fraci({
  brand: "drizzle.photo.fi",
  lengthBase: BASE26L,
  digitBase: BASE36L,
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
    photoFI: fi("photo_fi", () => fraciForPhotoFIInTagsOnPhotos), // Fractional Index
    tagFI: fi("tag_fi", () => fraciForTagFIInTagsOnPhotos), // Another Fractional Index
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

const fraciForPhotoFIInTagsOnPhotos = fraci({
  brand: "drizzle.tagsOnPhotos.photo_fi",
  lengthBase: BASE95,
  digitBase: BASE95,
});

const fraciForTagFIInTagsOnPhotos = fraci({
  brand: "drizzle.tagsOnPhotos.tag_fi",
  lengthBase: BASE95,
  digitBase: BASE95,
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
