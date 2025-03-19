import { asc, sql } from "drizzle-orm";
import { drizzleFraci } from "fraci/drizzle";
import { Hono } from "hono";
import {
  exampleItems as exampleItemsBinary,
  fiExampleItems as fiExampleItemsBinary,
} from "../../drizzle/schema.e2e-binary.js";
import {
  exampleItems as exampleItemsString,
  fiExampleItems as fiExampleItemsString,
} from "../../drizzle/schema.e2e-string.js";
import { setupDrizzleDBLibSQL as setupDrizzleDBLibSQLBinary } from "../../test/drizzle.e2e-binary.js";
import { setupDrizzleDBLibSQL as setupDrizzleDBLibSQLString } from "../../test/drizzle.e2e-string.js";

const dbBinary = await setupDrizzleDBLibSQLBinary();
const dbString = await setupDrizzleDBLibSQLString();

const app = new Hono().get("/test", async (c) => {
  const [binaryFI] = drizzleFraci(
    dbBinary,
    fiExampleItemsBinary
  ).generateKeyBetween(null, null);
  const [stringFI] = drizzleFraci(
    dbString,
    fiExampleItemsString
  ).generateKeyBetween(null, null);

  return c.json({
    binaryFI: Buffer.from(binaryFI).toString("hex"),
    stringFI: String(stringFI),

    binaryItems: await dbBinary
      .select({ name: exampleItemsBinary.name })
      .from(exampleItemsBinary)
      .where(sql`${exampleItemsBinary.groupId} = ${1}`)
      .orderBy(asc(exampleItemsBinary.fi))
      .all(),
    stringItems: await dbString
      .select({ name: exampleItemsString.name })
      .from(exampleItemsString)
      .where(sql`${exampleItemsString.groupId} = ${1}`)
      .orderBy(asc(exampleItemsString.fi))
      .all(),
  });
});

export default app;
