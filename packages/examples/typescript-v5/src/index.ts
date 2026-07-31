import { BASE62, fraciString, type FractionalIndexOf } from "fraci";

const ordering = fraciString({
  lengthBase: BASE62,
  digitBase: BASE62,
});

type Index = FractionalIndexOf<typeof ordering>;

const first: Index = ordering.generateKeyBetween(null, null).next().value;
ordering.generateKeyBetween(first, null);
