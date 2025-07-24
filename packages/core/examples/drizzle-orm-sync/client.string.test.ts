// Note that this test needs the package to be built before running and type checking.
import { test } from "bun:test";
import { runTest } from "../common/client-base.js";
import app from "./server.string.js";

test("E2E (Drizzle ORM Sync, String)", async () => {
  await runTest(app);
});
