// Note that this test needs the package to be built before running and type checking.
import { test } from "bun:test";
import app from "./server.string.js";
import { runTest } from "../common/client-base.js";

test("E2E (Prisma ORM, String)", async () => {
  await runTest(app);
});
