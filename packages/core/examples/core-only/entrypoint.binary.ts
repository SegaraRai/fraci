import { fraciBinary } from "fraci";
import { Hono } from "hono";
import { Buffer } from "node:buffer";

// Create a fraci instance for the example items
const fraciForExampleItem = fraciBinary({
  brand: "core.exampleItem.fi",
});

const app = new Hono().get("/test", async (c) => {
  const [fi] = fraciForExampleItem.generateKeyBetween(null, null);
  return c.json({ fi: Buffer.from(fi).toString("hex") });
});

export default app;
