// Note that this test needs the package to be built before running and type checking.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { hc } from "hono/client";
import app from "./server.js";

const client = hc<typeof app>("/", app);

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

test("E2E", async () => {
  // Add 3 items
  await client.groups[":groupId"].items.$post({
    param: { groupId: "1" },
    json: { name: "A" },
  });
  await client.groups[":groupId"].items.$post({
    param: { groupId: "1" },
    json: { name: "B" },
  });
  await client.groups[":groupId"].items.$post({
    param: { groupId: "1" },
    json: { name: "C" },
  });

  // Check if the items are created and ordered
  expect(await getItemsSimple("1")).toEqual([
    { name: "A" },
    { name: "B" },
    { name: "C" },
  ]);

  // Reorder the items
  {
    const [itemA, itemB, itemC] = await getItemsFull("1");
    const postRes = await client.groups[":groupId"].items[
      ":itemId"
    ].order.$post({
      param: { groupId: "1", itemId: String(itemC.id) },
      json: {
        beforeKey: itemA.fi,
        beforeKeySignature: itemA.__fi_fi_sign,
        afterKey: itemB.fi,
        afterKeySignature: itemB.__fi_fi_sign,
      },
    });
    expect(postRes.status).toBe(200);

    expect(await getItemsSimple("1")).toEqual([
      { name: "A" },
      { name: "C" },
      { name: "B" },
    ]);
  }

  // Add some items to another group
  await client.groups[":groupId"].items.$post({
    param: { groupId: "2" },
    json: { name: "D" },
  });
  await client.groups[":groupId"].items.$post({
    param: { groupId: "2" },
    json: { name: "E" },
  });

  // Check if the items are created and ordered
  expect(await getItemsSimple("2")).toEqual([{ name: "D" }, { name: "E" }]);

  // Try to reorder the items using another group's items
  {
    const [itemA, itemC] = await getItemsFull("1");
    const [itemD] = await getItemsFull("2");
    const postRes = await client.groups[":groupId"].items[
      ":itemId"
    ].order.$post({
      param: { groupId: "2", itemId: String(itemD.id) },
      json: {
        beforeKey: itemA.fi,
        beforeKeySignature: itemA.__fi_fi_sign,
        afterKey: itemC.fi,
        afterKeySignature: itemC.__fi_fi_sign,
      },
    });
    expect(postRes.status).toBe(400);
  }

  // Check if the items are not reordered
  expect(await getItemsSimple("2")).toEqual([{ name: "D" }, { name: "E" }]);


  
});
