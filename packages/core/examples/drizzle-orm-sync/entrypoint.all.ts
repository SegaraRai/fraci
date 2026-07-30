import { asc, sql } from "drizzle-orm";
import { drizzleFraciSync } from "fraci/drizzle";
import { Hono } from "hono";
import {
  exampleItems as exampleItemsBinary,
  fiExampleItems as fiExampleItemsBinary,
} from "../../drizzle/schema.e2e-binary.js";
import {
  exampleItems as exampleItemsString,
  fiExampleItems as fiExampleItemsString,
} from "../../drizzle/schema.e2e-string.js";
import { setupDrizzleDBBunSQLite as setupDrizzleDBBunSQLiteBinary } from "../../test/drizzle.e2e-binary.js";
import { setupDrizzleDBBunSQLite as setupDrizzleDBBunSQLiteString } from "../../test/drizzle.e2e-string.js";

const dbBinary = setupDrizzleDBBunSQLiteBinary();
const dbString = setupDrizzleDBBunSQLiteString();

const app = new Hono().get("/test", async (c) => {
  const [binaryFI] = drizzleFraciSync(
    dbBinary,
    fiExampleItemsBinary,
  ).generateKeyBetween(null, null);
  const [stringFI] = drizzleFraciSync(
    dbString,
    fiExampleItemsString,
  ).generateKeyBetween(null, null);

  return c.json({
    binaryFI: Buffer.from(binaryFI).toString("hex"),
    stringFI: String(stringFI),

    binaryItems: dbBinary
      .select({ name: exampleItemsBinary.name })
      .from(exampleItemsBinary)
      .where(sql`${exampleItemsBinary.groupId} = ${1}`)
      .orderBy(asc(exampleItemsBinary.fi))
      .all(),
    stringItems: dbString
      .select({ name: exampleItemsString.name })
      .from(exampleItemsString)
      .where(sql`${exampleItemsString.groupId} = ${1}`)
      .orderBy(asc(exampleItemsString.fi))
      .all(),
  });
});

export default app;
