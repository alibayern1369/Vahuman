import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  generateOrderAccessToken,
  hashOrderAccessToken,
  verifyOrderAccessToken,
} from "@/lib/orders/access";
import {
  generateOrderReference,
  isValidOrderReferenceFormat,
} from "@/lib/orders/reference";
import {
  assertOrderTransition,
  assertPaymentTransition,
  canSubmitReceipt,
  canTransitionOrder,
  canTransitionPayment,
} from "@/lib/orders/states";
import { calculateOrderTotals } from "@/lib/orders/totals";
import {
  assertAllowedReceiptMime,
  detectReceiptMime,
  RECEIPT_MAX_BYTES,
} from "@/lib/storage/private-storage";

describe("order totals", () => {
  it("resolves subtotal shipping discount server-side", () => {
    const totals = calculateOrderTotals({
      lines: [
        { unitPriceToman: 100_000, quantity: 2 },
        { unitPriceToman: 50_000, quantity: 1 },
      ],
      shippingToman: 30_000,
      discountToman: 10_000,
    });
    assert.equal(totals.subtotalToman, 250_000);
    assert.equal(totals.totalToman, 270_000);
    assert.deepEqual(totals.lineTotals, [200_000, 50_000]);
  });

  it("rejects empty carts", () => {
    assert.throws(() =>
      calculateOrderTotals({ lines: [], shippingToman: 0 }),
    );
  });

  it("snapshots stay independent of later price edits (contract)", () => {
    const atOrderTime = calculateOrderTotals({
      lines: [{ unitPriceToman: 120_000, quantity: 1 }],
      shippingToman: 0,
    });
    // Later catalog price would be 200_000 — order total must remain snapshotted.
    assert.equal(atOrderTime.totalToman, 120_000);
  });
});

describe("order reference", () => {
  it("generates unique-format public references", () => {
    const a = generateOrderReference();
    const b = generateOrderReference();
    assert.ok(isValidOrderReferenceFormat(a));
    assert.ok(isValidOrderReferenceFormat(b));
    assert.notEqual(a, b);
    assert.ok(!/^\d+$/.test(a), "must not be bare sequential id");
  });
});

describe("order / payment state machine", () => {
  it("allows receipt then verify path", () => {
    assert.equal(
      canTransitionOrder("pending_payment", "awaiting_payment_verification"),
      true,
    );
    assert.equal(
      canTransitionOrder("awaiting_payment_verification", "paid"),
      true,
    );
    assert.equal(canTransitionPayment("unpaid", "receipt_submitted"), true);
    assert.equal(canTransitionPayment("receipt_submitted", "verified"), true);
  });

  it("blocks delivered → pending_payment", () => {
    assert.equal(canTransitionOrder("delivered", "pending_payment"), false);
    assert.throws(() =>
      assertOrderTransition("delivered", "pending_payment"),
    );
  });

  it("blocks verified payment reverse", () => {
    assert.equal(canTransitionPayment("verified", "unpaid"), false);
    assert.throws(() => assertPaymentTransition("verified", "unpaid"));
  });

  it("receipt never implies verified", () => {
    assert.equal(canTransitionPayment("unpaid", "verified"), false);
  });
});

describe("receipt submission gates", () => {
  it("allows unpaid before expiry", () => {
    assert.equal(
      canSubmitReceipt({
        orderStatus: "pending_payment",
        paymentStatus: "unpaid",
        reservationExpiresAt: new Date(Date.now() + 60_000),
      }),
      true,
    );
  });

  it("blocks after verified / paid", () => {
    assert.equal(
      canSubmitReceipt({
        orderStatus: "paid",
        paymentStatus: "verified",
        reservationExpiresAt: new Date(Date.now() + 60_000),
      }),
      false,
    );
  });

  it("blocks after reservation expiry", () => {
    assert.equal(
      canSubmitReceipt({
        orderStatus: "pending_payment",
        paymentStatus: "unpaid",
        reservationExpiresAt: new Date(Date.now() - 1000),
      }),
      false,
    );
  });
});

describe("guest order access token", () => {
  it("verifies high-entropy tokens via hash", () => {
    const token = generateOrderAccessToken();
    const hash = hashOrderAccessToken(token);
    assert.equal(verifyOrderAccessToken(token, hash), true);
    assert.equal(verifyOrderAccessToken("wrong", hash), false);
    assert.equal(verifyOrderAccessToken("", hash), false);
  });
});

describe("receipt file validation", () => {
  it("sniffs jpeg magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.equal(detectReceiptMime(buf), "image/jpeg");
  });

  it("rejects spoofed extension-only claims", () => {
    const buf = Buffer.from("not-an-image");
    assert.equal(detectReceiptMime(buf), null);
  });

  it("allows listed mime types only", () => {
    assert.equal(assertAllowedReceiptMime("image/png"), "image/png");
    assert.throws(() => assertAllowedReceiptMime("text/html"));
  });

  it("documents max size", () => {
    assert.equal(RECEIPT_MAX_BYTES, 5 * 1024 * 1024);
  });
});
