import { BASE62, fraci } from "fraci";
import { Hono } from "hono";
import { Buffer } from "node:buffer";

const fraciBinary = fraci({
  type: "binary",
  brand: "core.exampleItem.fi",
});

const fraciString = fraci({
  brand: "core.exampleItem.fi",
  lengthBase: BASE62,
  digitBase: BASE62,
});

const app = new Hono().get("/test", async (c) => {
  const [binaryFI] = fraciBinary.generateKeyBetween(null, null);
  const [stringFI] = fraciString.generateKeyBetween(null, null);
  return c.json({
    binaryFI: Buffer.from(binaryFI).toString("hex"),
    stringFI: String(stringFI),
  });
});

export default app;
