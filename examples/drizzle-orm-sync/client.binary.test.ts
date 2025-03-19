// Note that this test needs the package to be built before running and type checking.
import { test } from "bun:test";
import app from "./server.binary.js";
import { runTest } from "../common/client-base.js";

test("E2E (Drizzle ORM Sync, Binary)", async () => {
  await runTest(app);
});
