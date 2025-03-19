// Note that this test needs the package to be built before running and type checking.
import { test } from "bun:test";
import { runTest } from "../common/client-base.js";
import app from "./server.binary.js";

test("E2E (Drizzle ORM Async, Binary)", async () => {
  await runTest(app);
});
