// Note that this test needs the package to be built before running and type checking.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { hc } from "hono/client";
import app from "./server.js";

const client = hc<typeof app>("/", {
  fetch: app.request,
});

beforeAll(async () => {
  await client.initialize.$post();
});

afterAll(async () => {
  await client.cleanup.$post();
});

const getItemsFull = async (groupId: string) => {
  const res = await client.groups[":groupId"].items.$get({
    param: { groupId },
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return data;
};

const getItemsSimple = async (groupId: string) => {
  const res = await client.groups[":groupId"]["items.simple"].$get({
    param: { groupId },
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  return data;
};

const getItemByName = async (groupId: string, name: string) => {
  const items = await getItemsFull(groupId);
  const item = items.find((i) => i.name === name);
  if (!item) {
    throw new Error(`Item ${name} not found in group ${groupId}`);
  }
  return item;
};

test("E2E", async () => {
  // Add 3 items
  {
    const r1 = await client.groups[":groupId"].items.$post({
      param: { groupId: "1" },
      json: { name: "A" },
      query: {},
    });
    const r2 = await client.groups[":groupId"].items.$post({
      param: { groupId: "1" },
      json: { name: "B" },
      query: {},
    });
    const r3 = await client.groups[":groupId"].items.$post({
      param: { groupId: "1" },
      json: { name: "C" },
      query: {},
    });

    // Check if the items are created and ordered
    expect(await getItemsSimple("1")).toEqual([
      { name: "A" },
      { name: "B" },
      { name: "C" },
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r1.headers.get("Fraci-Retry-Count")).toBe("0");
    expect(r2.headers.get("Fraci-Retry-Count")).toBe("0");
    expect(r3.headers.get("Fraci-Retry-Count")).toBe("0");

    console.log(
      "NO-DELAY1",
      (await getItemsFull("1")).map((i) => i.fi)
    );
  }

  // Reorder the items
  {
    const [, itemB, itemC] = await getItemsFull("1");
    const r1 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "1", itemId: String(itemC.id) },
      json: {
        before: itemB.id,
      },
      query: {},
    });

    expect(r1.status).toBe(200);
    expect(r1.headers.get("Fraci-Retry-Count")).toBe("0");

    expect(await getItemsSimple("1")).toEqual([
      { name: "A" },
      { name: "C" },
      { name: "B" },
    ]);

    console.log(
      "NO-DELAY2",
      (await getItemsFull("1")).map((i) => i.fi)
    );
  }

  // Add some items to another group with delay
  {
    const p1 = client.groups[":groupId"].items.$post({
      param: { groupId: "2" },
      json: { name: "D" },
      query: { delay: "200" },
    });
    await new Promise((r) => setTimeout(r, 30));

    const p2 = client.groups[":groupId"].items.$post({
      param: { groupId: "2" },
      json: { name: "E" },
      query: { delay: "200" },
    });
    await new Promise((r) => setTimeout(r, 30));

    const p3 = client.groups[":groupId"].items.$post({
      param: { groupId: "2" },
      json: { name: "F" },
      query: { delay: "200" },
    });
    await new Promise((r) => setTimeout(r, 30));

    const p4 = client.groups[":groupId"].items.$post({
      param: { groupId: "2" },
      json: { name: "G" },
      query: { delay: "200" },
    });

    const r1 = await p1;
    const r2 = await p2;
    const r3 = await p3;
    const r4 = await p4;

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r4.status).toBe(200);
    expect(r1.headers.get("Fraci-Retry-Count")).toBe("0");
    expect(r2.headers.get("Fraci-Retry-Count")).toBe("1");
    expect(r3.headers.get("Fraci-Retry-Count")).toBe("2");
    expect(r4.headers.get("Fraci-Retry-Count")).toBe("3");

    // Check if the items are created and ordered
    expect(await getItemsSimple("2")).toEqual([
      { name: "D" },
      { name: "E" },
      { name: "F" },
      { name: "G" },
    ]);

    console.log(
      "DELAY1",
      (await getItemsFull("2")).map((i) => i.fi)
    );
  }

  // Reorder the items with delay
  {
    const [itemD, itemE, itemF, itemG] = await getItemsFull("2");
    const p1 = client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "2", itemId: String(itemE.id) },
      json: {
        before: itemD.id,
      },
      query: { delay: "200" },
    });
    await new Promise((r) => setTimeout(r, 30));

    const p2 = client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "2", itemId: String(itemF.id) },
      json: {
        before: itemD.id,
      },
      query: { delay: "200" },
    });
    await new Promise((r) => setTimeout(r, 30));

    const p3 = client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "2", itemId: String(itemG.id) },
      json: {
        before: itemD.id,
      },
      query: { delay: "200" },
    });

    const r1 = await p1;
    const r2 = await p2;
    const r3 = await p3;

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(r1.headers.get("Fraci-Retry-Count")).toBe("0");
    expect(r2.headers.get("Fraci-Retry-Count")).toBe("1");
    expect(r3.headers.get("Fraci-Retry-Count")).toBe("2");

    expect(await getItemsSimple("2")).toEqual([
      { name: "E" },
      { name: "F" },
      { name: "G" },
      { name: "D" },
    ]);

    console.log(
      "DELAY2",
      (await getItemsFull("2")).map((i) => i.fi)
    );
  }

  // Reorder using `after`
  {
    await client.groups[":groupId"].items.$post({
      param: { groupId: "3" },
      json: { name: "H" },
      query: {},
    });
    await client.groups[":groupId"].items.$post({
      param: { groupId: "3" },
      json: { name: "I" },
      query: {},
    });
    await client.groups[":groupId"].items.$post({
      param: { groupId: "3" },
      json: { name: "J" },
      query: {},
    });

    // Check if the items are created and ordered
    expect(await getItemsSimple("3")).toEqual([
      { name: "H" },
      { name: "I" },
      { name: "J" },
    ]);

    const [itemH, itemI, itemJ] = await getItemsFull("3");

    // Reorder H after J
    const r1 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: String(itemH.id) },
      json: {
        after: itemJ.id,
      },
      query: {},
    });

    expect(r1.status).toBe(200);
    expect(await getItemsSimple("3")).toEqual([
      { name: "I" },
      { name: "J" },
      { name: "H" },
    ]);

    // Reorder I after J
    const r2 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: String(itemI.id) },
      json: {
        after: itemJ.id,
      },
      query: {},
    });

    expect(r2.status).toBe(200);
    expect(await getItemsSimple("3")).toEqual([
      { name: "J" },
      { name: "I" },
      { name: "H" },
    ]);
  }

  // Try to reorder inexistent item
  {
    const itemA = await getItemByName("1", "A");
    const itemH = await getItemByName("3", "H");

    // Try to reorder an inexistent item
    const r1 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: "999999" },
      json: {
        before: itemH.id,
      },
      query: {},
    });

    expect(r1.status).toBe(404);
    expect(await r1.json()).toEqual({ error: "Item not found" });

    // Try to reorder an item in another group
    const r2 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: String(itemA.id) },
      json: {
        before: itemH.id,
      },
      query: {},
    });

    expect(r2.status).toBe(404);
    expect(await r2.json()).toEqual({ error: "Item not found" });
  }

  // Try to reorder an item by referencing an inexistent item
  {
    const itemA = await getItemByName("1", "A");
    const itemH = await getItemByName("3", "H");

    // Try to reorder an item by referencing an inexistent item
    const r1 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: String(itemH.id) },
      json: {
        before: 999999,
      },
      query: {},
    });

    expect(r1.status).toBe(400);
    expect(await r1.json()).toEqual({ error: "Reference item not found" });

    // Try to reorder an item by referencing an item in another group
    const r2 = await client.groups[":groupId"].items[":itemId"].order.$post({
      param: { groupId: "3", itemId: String(itemH.id) },
      json: {
        before: itemA.id,
      },
      query: {},
    });

    expect(r2.status).toBe(400);
    expect(await r2.json()).toEqual({ error: "Reference item not found" });
  }
});
