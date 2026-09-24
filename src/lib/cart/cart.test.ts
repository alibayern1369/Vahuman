import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateCartSubtotal } from "@/lib/cart/cart";
import { isInStock } from "@/lib/catalog/inventory";
import { assertTomanAmount } from "@/lib/catalog/money";

describe("cart totals", () => {
  it("sums integer toman lines", () => {
    assert.equal(
      calculateCartSubtotal([
        { unitPriceToman: 1000, quantity: 2 },
        { unitPriceToman: 500, quantity: 1 },
      ]),
      2500,
    );
  });

  it("rejects non-integer money", () => {
    assert.throws(() =>
      calculateCartSubtotal([{ unitPriceToman: 1.5 as number, quantity: 1 }]),
    );
  });
});

describe("stock validation helpers", () => {
  it("treats untracked inventory as in stock", () => {
    assert.equal(isInStock({ trackInventory: false, stockQuantity: 0 }), true);
  });

  it("requires positive stock when tracked", () => {
    assert.equal(isInStock({ trackInventory: true, stockQuantity: 0 }), false);
    assert.equal(isInStock({ trackInventory: true, stockQuantity: 2 }), true);
  });
});

describe("published visibility contract", () => {
  it("keeps money canonical as integer toman", () => {
    assert.equal(assertTomanAmount(199000), 199000);
  });
});
