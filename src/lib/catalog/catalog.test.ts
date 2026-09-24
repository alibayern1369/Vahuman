import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { wouldCreateCategoryCycle } from "@/lib/catalog/category-tree";
import { assertCompareAtPrice, assertTomanAmount } from "@/lib/catalog/money";
import { slugify, withSlugCollisionSuffix } from "@/lib/catalog/slug";
import { buildCombinationKey, cartesianProduct } from "@/lib/catalog/variants";

describe("money", () => {
  it("accepts integer toman", () => {
    assert.equal(assertTomanAmount(12000), 12000);
  });

  it("rejects float money", () => {
    assert.throws(() => assertTomanAmount(12.5));
  });

  it("rejects compare-at below selling price", () => {
    assert.throws(() => assertCompareAtPrice(1000, 500));
  });
});

describe("slug", () => {
  it("keeps persian letters", () => {
    assert.equal(slugify("تی‌شرت مشکی"), "تیشرت-مشکی");
  });

  it("adds collision suffix", () => {
    assert.equal(withSlugCollisionSuffix("shirt", 3), "shirt-3");
  });
});

describe("variants", () => {
  it("builds deterministic combination keys", () => {
    assert.equal(buildCombinationKey(["b", "a"]), "a|b");
    assert.equal(buildCombinationKey(["a", "b"]), "a|b");
  });

  it("rejects duplicate variant identity via same key", () => {
    const key1 = buildCombinationKey(["x", "y"]);
    const key2 = buildCombinationKey(["y", "x"]);
    assert.equal(key1, key2);
  });

  it("computes cartesian products", () => {
    assert.deepEqual(cartesianProduct([["a", "b"], ["1"]]), [
      ["a", "1"],
      ["b", "1"],
    ]);
  });
});

describe("category cycles", () => {
  it("detects self parent", () => {
    assert.equal(
      wouldCreateCategoryCycle([{ id: "1", parentId: null }], "1", "1"),
      true,
    );
  });

  it("detects ancestor cycle", () => {
    const cats = [
      { id: "1", parentId: null },
      { id: "2", parentId: "1" },
      { id: "3", parentId: "2" },
    ];
    assert.equal(wouldCreateCategoryCycle(cats, "1", "3"), true);
    assert.equal(wouldCreateCategoryCycle(cats, "3", "1"), false);
  });
});
