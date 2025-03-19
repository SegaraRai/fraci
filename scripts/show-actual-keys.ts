import { BASE62, fraciBinary, fraciString } from "fraci";

{
  const fi = fraciBinary();

  const [key1] = fi.generateKeyBetween(null, null);
  const [key2] = fi.generateKeyBetween(key1, null);
  const [key3] = fi.generateKeyBetween(key2, null);
  const [key4] = fi.generateKeyBetween(key1, key2);
  const [key5] = fi.generateKeyBetween(key1, key4);

  console.log("binary", { key1, key2, key3, key4, key5 });
}

{
  const fi = fraciString({
    digitBase: BASE62,
    lengthBase: BASE62,
  });

  const [key1] = fi.generateKeyBetween(null, null);
  const [key2] = fi.generateKeyBetween(key1, null);
  const [key3] = fi.generateKeyBetween(key2, null);
  const [key4] = fi.generateKeyBetween(key1, key2);
  const [key5] = fi.generateKeyBetween(key1, key4);

  console.log("string", { key1, key2, key3, key4, key5 });
}
