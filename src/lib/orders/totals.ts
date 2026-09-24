/**
 * Server-side order total calculation.
 * Never trust browser-supplied prices or totals.
 */
import { assertTomanAmount } from "@/lib/catalog/money";

export type OrderLineInput = {
  unitPriceToman: number;
  quantity: number;
};

export function calculateLineTotal(line: OrderLineInput): number {
  const unit = assertTomanAmount(line.unitPriceToman, "قیمت واحد");
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new Error("تعداد باید عدد صحیح حداقل ۱ باشد.");
  }
  return unit * line.quantity;
}

export function calculateOrderTotals(input: {
  lines: OrderLineInput[];
  shippingToman: number;
  discountToman?: number;
}): {
  subtotalToman: number;
  shippingToman: number;
  discountToman: number;
  totalToman: number;
  lineTotals: number[];
} {
  if (!input.lines.length) {
    throw new Error("سفارش باید حداقل یک قلم داشته باشد.");
  }
  const lineTotals = input.lines.map(calculateLineTotal);
  const subtotalToman = lineTotals.reduce((a, b) => a + b, 0);
  const shippingToman = assertTomanAmount(input.shippingToman, "هزینه ارسال");
  const discountToman = assertTomanAmount(
    input.discountToman ?? 0,
    "تخفیف",
  );
  if (discountToman > subtotalToman + shippingToman) {
    throw new Error("تخفیف از مبلغ قابل پرداخت بیشتر است.");
  }
  const totalToman = subtotalToman + shippingToman - discountToman;
  return {
    subtotalToman,
    shippingToman,
    discountToman,
    totalToman,
    lineTotals,
  };
}
