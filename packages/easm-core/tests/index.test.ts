import test from "tape";

import { getPath } from "../src/store";
import { Key } from "../src/types";

test("Store Tests - getPath([])", (t) => {

  const path = getPath([]);
  const expected: Key[] = [];

  t.equals(typeof path, typeof expected, "Typeof path must be Key[]");
  t.equals(path.length, expected.length, "Path length must be equal to expected length");

  t.end();
});
