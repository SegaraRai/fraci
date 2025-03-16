import { BASE62, fraci } from "fraci";

const fi = fraci({
  digitBase: BASE62,
  lengthBase: BASE62,
});

const [key1] = fi.generateKeyBetween(null, null);
const [key2] = fi.generateKeyBetween(key1, null);
const [key3] = fi.generateKeyBetween(key2, null);
const [key4] = fi.generateKeyBetween(key1, key2);

console.log({ key1, key2, key3, key4 });
