import { BASE62, fraci } from "fraci";
import { Hono } from "hono";
import { Buffer } from "node:buffer";

const fraci1 = fraci({
  type: "binary",
  brand: "core.exampleItem.fi",
});

const fraci2 = fraci({
  brand: "core.exampleItem.fi",
  lengthBase: BASE62,
  digitBase: BASE62,
});

const app = new Hono().get("/test", async (c) => {
  const [fi1] = fraci1.generateKeyBetween(null, null);
  const [fi2] = fraci2.generateKeyBetween(null, null);
  return c.json({ fi1: Buffer.from(fi1).toString("hex"), fi2: String(fi2) });
});

export default app;
